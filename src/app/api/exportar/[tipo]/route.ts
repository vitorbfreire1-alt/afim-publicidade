import { getUser, pode } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { paraCsv, type Celula } from "@/lib/csv";
import { calcularEncargos, regrasDe } from "@/lib/encargos";
import { filtroEmAtraso, statusParcela } from "@/lib/financeiro";
import { diasEntre, hoje } from "@/lib/format";
import { CATEGORIA_LABEL, FORMA_LABEL, STATUS_CONTRATO_LABEL, TIPO_SINGULAR } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { contratosFinalizados, periodoDe } from "@/lib/relatorios";

export const dynamic = "force-dynamic";

const SIT = { PAGA: "Recebida", ATRASADA: "Em atraso", A_VENCER: "A vencer", RENEGOCIADA: "Renegociada" } as const;
const num = (v: unknown) => (v == null ? null : Number(v));

/** Exportações em CSV (abre no Excel). Dados financeiros só para Dono/Financeiro. */
export async function GET(req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const { tipo } = await params;
  const url = new URL(req.url);
  const { inicio, fim } = periodoDe(url.searchParams.get("de") ?? undefined, url.searchParams.get("ate") ?? undefined);
  const h = hoje();

  let cab: string[] = [];
  let linhas: Celula[][] = [];

  if (tipo === "clientes" && pode(user, "clientes")) {
    const r = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });
    cab = ["Cliente", "CPF/CNPJ", "Contato", "Telefone", "E-mail", "Ativo"];
    linhas = r.map((c) => [c.nome, c.documento, c.contato, c.telefone, c.email, c.ativo ? "Sim" : "Não"]);
  } else if (tipo === "contratos" && pode(user, "carteira", "valores")) {
    const r = await prisma.contrato.findMany({ orderBy: { numero: "asc" }, include: { cliente: true, vendedor: true, pontos: { include: { ponto: true } } } });
    cab = ["Nº", "Cliente", "Ponto", "Tipo", "Valor mensal", "Início", "Prazo (meses)", "Fim", "Dia vencimento", "Forma de pagamento", "Status", "Vendedor"];
    linhas = r.flatMap((c) =>
      c.pontos.map((cp) => [c.numero, c.cliente.nome, cp.ponto.nome, TIPO_SINGULAR[cp.ponto.tipo], num(cp.valor), cp.inicio, cp.prazoMeses, cp.fim, c.diaVencimento, FORMA_LABEL[c.formaPagamento], STATUS_CONTRATO_LABEL[c.status], c.vendedor?.nome]),
    );
  } else if (tipo === "inadimplentes" && pode(user, "receber")) {
    // Um cliente por linha, com o que ele deve hoje (parcelas vencidas e ainda não pagas), com multa e juros.
    const regras = regrasDe(await getConfig());
    const r = await prisma.parcela.findMany({ where: filtroEmAtraso(), orderBy: { vencimento: "asc" }, include: { contrato: { include: { cliente: true } } } });
    const porCliente = new Map<string, { cliente: (typeof r)[number]["contrato"]["cliente"]; contratos: Set<number>; parcelas: number; maisAntiga: Date; nominal: number; atualizado: number }>();
    for (const p of r) {
      const c = p.contrato.cliente;
      const l = porCliente.get(c.id) ?? { cliente: c, contratos: new Set<number>(), parcelas: 0, maisAntiga: p.vencimento, nominal: 0, atualizado: 0 };
      l.contratos.add(p.contrato.numero);
      l.parcelas += 1;
      if (p.vencimento < l.maisAntiga) l.maisAntiga = p.vencimento;
      l.nominal += Number(p.valor);
      l.atualizado += calcularEncargos(Number(p.valor), p.vencimento, regras, h).total;
      porCliente.set(c.id, l);
    }
    cab = ["Cliente", "CPF/CNPJ", "Contato", "Telefone", "E-mail", "Contratos", "Parcelas em atraso", "Vencida desde", "Dias de atraso", "Valor nominal", "Valor atualizado (multa e juros)"];
    linhas = [...porCliente.values()]
      .sort((a, b) => b.atualizado - a.atualizado)
      .map((l) => [l.cliente.nome, l.cliente.documento, l.cliente.contato, l.cliente.telefone, l.cliente.email, [...l.contratos].sort((a, b) => a - b).map((n) => `#${n}`).join(", "), l.parcelas, l.maisAntiga, diasEntre(l.maisAntiga, h), Math.round(l.nominal * 100) / 100, Math.round(l.atualizado * 100) / 100]);
  } else if (tipo === "finalizados" && pode(user, "carteira", "valores")) {
    const r = await contratosFinalizados({ inicio, fim });
    cab = ["Nº", "Cliente", "Pontos", "Início", "Fim", "Forma de pagamento", "Status", "Contratado", "Recebido", "Em aberto", "Situação"];
    linhas = r.map((c) => [c.numero, c.cliente, c.pontos.join(", "), c.inicio, c.fim, FORMA_LABEL[c.formaPagamento as keyof typeof FORMA_LABEL], STATUS_CONTRATO_LABEL[c.status as keyof typeof STATUS_CONTRATO_LABEL], c.total, c.recebido, c.emAberto, c.emAberto > 0 ? "Com saldo" : "Quitado"]);
  } else if (tipo === "parcelas" && pode(user, "receber")) {
    const regras = regrasDe(await getConfig());
    const r = await prisma.parcela.findMany({
      where: { OR: [{ vencimento: { gte: inicio, lte: fim } }, { pagoEm: { gte: inicio, lte: fim } }] },
      orderBy: [{ vencimento: "asc" }],
      include: { contrato: { include: { cliente: true } } },
    });
    cab = ["Cliente", "Contrato", "Parcela", "Vencimento", "Valor", "Situação", "Valor atualizado", "Pago em", "Valor pago", "Forma recebida"];
    linhas = r.map((p) => [
      p.contrato.cliente.nome, p.contrato.numero, p.numero, p.vencimento, num(p.valor), SIT[statusParcela(p, h)],
      p.pagoEm || p.renegociadaEm ? null : calcularEncargos(Number(p.valor), p.vencimento, regras, h).total, p.pagoEm, num(p.valorPago), p.formaRecebida ? FORMA_LABEL[p.formaRecebida] : null,
    ]);
  } else if (tipo === "despesas" && pode(user, "despesas")) {
    const r = await prisma.despesa.findMany({ where: { OR: [{ vencimento: { gte: inicio, lte: fim } }, { pagoEm: { gte: inicio, lte: fim } }] }, orderBy: { vencimento: "asc" }, include: { ponto: true } });
    cab = ["Descrição", "Categoria", "Fornecedor", "Ponto", "Vencimento", "Valor", "Pago em", "Valor pago"];
    linhas = r.map((d) => [d.descricao, CATEGORIA_LABEL[d.categoria], d.fornecedor, d.ponto?.nome, d.vencimento, num(d.valor), d.pagoEm, num(d.valorPago)]);
  } else {
    return new Response("Exportação não encontrada ou sem permissão", { status: 404 });
  }

  return new Response(paraCsv(cab, linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="afim-${tipo}-${h.toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
