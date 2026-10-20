import { getUser, podeEditarCadastros, podeReceber } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Item {
  titulo: string;
  detalhe?: string;
  href: string;
}

const LIMITE = 5;

/** Busca geral (Ctrl+K). Cada perfil só encontra o que pode ver. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return Response.json({ grupos: [] });
  const contem = { contains: q, mode: "insensitive" as const };
  const numero = /^#?(\d{1,7})$/.exec(q) ? Number(/^#?(\d{1,7})$/.exec(q)![1]) : null;

  const [clientes, contratos, pontos, propostas, despesas, ocorrencias] = await Promise.all([
    prisma.cliente.findMany({ where: { OR: [{ nome: contem }, { documento: contem }, { telefone: contem }, { contato: contem }, { email: contem }] }, take: LIMITE, orderBy: { nome: "asc" } }),
    prisma.contrato.findMany({
      where: { OR: [{ cliente: { nome: contem } }, ...(numero !== null ? [{ numero }] : []), { pontos: { some: { ponto: { nome: contem } } } }] },
      take: LIMITE,
      orderBy: { numero: "desc" },
      include: { cliente: true },
    }),
    prisma.ponto.findMany({ where: { OR: [{ nome: contem }, { endereco: contem }] }, take: LIMITE, orderBy: { nome: "asc" } }),
    podeEditarCadastros(user.papel)
      ? prisma.proposta.findMany({ where: { OR: [{ cliente: { nome: contem } }, ...(numero !== null ? [{ numero }] : [])] }, take: LIMITE, orderBy: { numero: "desc" }, include: { cliente: true } })
      : Promise.resolve([]),
    podeReceber(user.papel)
      ? prisma.despesa.findMany({ where: { OR: [{ descricao: contem }, { fornecedor: contem }] }, take: LIMITE, orderBy: { vencimento: "desc" } })
      : Promise.resolve([]),
    prisma.ocorrencia.findMany({ where: { OR: [{ titulo: contem }, { ponto: { nome: contem } }] }, take: LIMITE, orderBy: { abertaEm: "desc" }, include: { ponto: true } }),
  ]);

  const grupos: { titulo: string; itens: Item[] }[] = [
    { titulo: "Clientes", itens: clientes.map((c) => ({ titulo: c.nome, detalhe: [c.documento, c.telefone].filter(Boolean).join(" · "), href: `/clientes/${c.id}` })) },
    { titulo: "Contratos", itens: contratos.map((c) => ({ titulo: `Contrato #${c.numero}`, detalhe: c.cliente.nome, href: `/contratos/${c.id}` })) },
    { titulo: "Pontos", itens: pontos.map((p) => ({ titulo: p.nome, detalhe: p.endereco ?? undefined, href: `/pontos/${p.id}` })) },
    { titulo: "Propostas", itens: propostas.map((p) => ({ titulo: `Proposta #${p.numero}`, detalhe: p.cliente.nome, href: `/propostas/${p.id}` })) },
    { titulo: "Despesas", itens: despesas.map((d) => ({ titulo: d.descricao, detalhe: d.fornecedor ?? undefined, href: `/despesas?f=${d.pagoEm ? "pagas" : d.vencimento < new Date() ? "atraso" : "pagar"}` })) },
    { titulo: "Manutenção", itens: ocorrencias.map((o) => ({ titulo: o.titulo, detalhe: o.ponto.nome, href: `/ocorrencias/${o.id}` })) },
  ].filter((g) => g.itens.length > 0);

  return Response.json({ grupos }, { headers: { "Cache-Control": "no-store" } });
}
