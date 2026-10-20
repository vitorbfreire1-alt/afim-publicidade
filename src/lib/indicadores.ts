import { addMeses } from "./financeiro";
import { addDias, hoje } from "./format";
import { prisma } from "./prisma";

export interface Indicadores {
  mrr: number;
  arr: number;
  clientesAtivos: number;
  ticketMedio: number;
  receitaEmRisco: number;
  contratosEmRisco: number;
  taxaInadimplencia: number | null; // % do que venceu nos últimos 12 meses e segue em aberto
  mrrPorMes: { rotulo: string; valor: number; atual: boolean }[];
  ocupacaoPorTipo: { tipo: string; pontos: number; comClientes: number; cotasUsadas: number; cotasTotal: number }[];
  vendedores: { nome: string; mrr: number; contratos: number }[];
  porM2: { id: string; nome: string; area: number; mrr: number; porM2: number }[];
  funil: { abertas: number; valorAberto: number; fechadas: number; perdidas: number; conversao: number | null };
}

const arred = (n: number) => Math.round(n * 100) / 100;

export async function calcularIndicadores(): Promise<Indicadores> {
  const h = hoje();
  const inicioHistorico = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 11, 1));

  const [cps, pontos, propostas, vencidas12m, emAberto12m] = await Promise.all([
    prisma.contratoPonto.findMany({
      where: { contrato: { status: { not: "CANCELADO" } }, fim: { gte: inicioHistorico } },
      select: { pontoId: true, valor: true, inicio: true, fim: true, contrato: { select: { id: true, status: true, clienteId: true, vendedor: { select: { nome: true } } } }, ponto: { select: { tipo: true } } },
    }),
    prisma.ponto.findMany({ where: { ativo: true }, select: { id: true, nome: true, tipo: true, cotas: true, larguraM: true, alturaM: true } }),
    prisma.proposta.findMany({ select: { status: true, pontos: { select: { valor: true } }, atualizadoEm: true } }),
    prisma.parcela.aggregate({ where: { renegociadaEm: null, vencimento: { gte: addDias(h, -365), lt: h } }, _sum: { valor: true } }),
    prisma.parcela.aggregate({ where: { renegociadaEm: null, pagoEm: null, vencimento: { gte: addDias(h, -365), lt: h }, contrato: { status: "ATIVO" } }, _sum: { valor: true } }),
  ]);

  const ativos = cps.filter((c) => c.contrato.status === "ATIVO" && c.inicio <= h && h <= c.fim);
  const mrr = ativos.reduce((s, c) => s + Number(c.valor), 0);
  const clientes = new Set(ativos.map((c) => c.contrato.clienteId));

  // Receita que vence nos próximos 90 dias (precisa de renovação).
  const risco = cps.filter((c) => c.contrato.status === "ATIVO" && c.fim >= h && c.fim <= addDias(h, 90));

  // Evolução da receita recorrente, mês a mês (valor atual de cada ponto enquanto o período o cobre).
  const mrrPorMes = Array.from({ length: 12 }, (_, i) => {
    const ini = addMeses(inicioHistorico, i, 1);
    const fim = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth() + 1, 0));
    const valor = cps.filter((c) => c.inicio <= fim && c.fim >= ini).reduce((s, c) => s + Number(c.valor), 0);
    return {
      rotulo: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(ini).replace(".", ""),
      valor,
      atual: ini.getUTCFullYear() === h.getUTCFullYear() && ini.getUTCMonth() === h.getUTCMonth(),
    };
  });

  const ocupacaoPorTipo = (["LED", "TOTEM", "TRIEDRO", "OUTDOOR"] as const).map((tipo) => {
    const doTipo = pontos.filter((p) => p.tipo === tipo);
    const vigentes = ativos.filter((c) => c.ponto.tipo === tipo);
    return {
      tipo,
      pontos: doTipo.length,
      comClientes: doTipo.filter((p) => vigentes.some((c) => c.pontoId === p.id)).length,
      cotasUsadas: vigentes.filter((c) => doTipo.some((p) => p.id === c.pontoId && p.cotas)).length,
      cotasTotal: doTipo.reduce((s, p) => s + (p.cotas ?? 0), 0),
    };
  });

  const porVend = new Map<string, { mrr: number; contratos: Set<string> }>();
  for (const c of ativos) {
    const nome = c.contrato.vendedor?.nome ?? "Sem vendedor";
    const v = porVend.get(nome) ?? { mrr: 0, contratos: new Set<string>() };
    v.mrr += Number(c.valor);
    v.contratos.add(c.contrato.id);
    porVend.set(nome, v);
  }

  const mrrPonto = new Map<string, number>();
  for (const c of ativos) mrrPonto.set(c.pontoId, (mrrPonto.get(c.pontoId) ?? 0) + Number(c.valor));
  const porM2 = pontos
    .filter((p) => p.larguraM && p.alturaM && mrrPonto.has(p.id))
    .map((p) => {
      const area = Number(p.larguraM) * Number(p.alturaM);
      return { id: p.id, nome: p.nome, area, mrr: mrrPonto.get(p.id)!, porM2: arred(mrrPonto.get(p.id)! / area) };
    })
    .sort((a, b) => b.porM2 - a.porM2)
    .slice(0, 5);

  const abertas = propostas.filter((p) => p.status === "ENVIADA" || p.status === "NEGOCIANDO");
  const desde = addDias(h, -180);
  const recentes = propostas.filter((p) => p.atualizadoEm >= desde);
  const fechadas = recentes.filter((p) => p.status === "FECHADA").length;
  const perdidas = recentes.filter((p) => p.status === "PERDIDA").length;
  const totalVencido = Number(vencidas12m._sum.valor ?? 0);

  return {
    mrr,
    arr: mrr * 12,
    clientesAtivos: clientes.size,
    ticketMedio: clientes.size ? mrr / clientes.size : 0,
    receitaEmRisco: risco.reduce((s, c) => s + Number(c.valor), 0),
    contratosEmRisco: new Set(risco.map((c) => c.contrato.id)).size,
    taxaInadimplencia: totalVencido > 0 ? arred((Number(emAberto12m._sum.valor ?? 0) / totalVencido) * 100) : null,
    mrrPorMes,
    ocupacaoPorTipo,
    vendedores: [...porVend.entries()].map(([nome, v]) => ({ nome, mrr: v.mrr, contratos: v.contratos.size })).sort((a, b) => b.mrr - a.mrr),
    porM2,
    funil: {
      abertas: abertas.length,
      valorAberto: abertas.reduce((s, p) => s + p.pontos.reduce((t, x) => t + Number(x.valor), 0), 0),
      fechadas,
      perdidas,
      conversao: fechadas + perdidas > 0 ? Math.round((fechadas / (fechadas + perdidas)) * 100) : null,
    },
  };
}

export const chaveDoMes = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
