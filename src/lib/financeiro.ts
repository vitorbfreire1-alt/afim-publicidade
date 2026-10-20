import { prisma } from "./prisma";
import { calcularEncargos, regrasDe } from "./encargos";
import { getConfig } from "./config";
import { addDias, hoje } from "./format";

/** Soma meses (UTC) travando o dia no último dia do mês quando preciso. */
export function addMeses(d: Date, n: number, dia = d.getUTCDate()): Date {
  const alvo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(dia, ultimo));
  return alvo;
}

/** Fim do contrato: início + prazo, menos um dia (12 meses a partir de 10/01 → 09/01 do ano seguinte). */
export const calcularFim = (inicio: Date, prazoMeses: number) => addDias(addMeses(inicio, prazoMeses), -1);

/**
 * Uma parcela por mês de contrato. A 1ª vence no dia de vencimento do mês de início;
 * se esse dia já passou em relação ao início, vai para o mês seguinte.
 */
export function gerarParcelas(inicio: Date, prazoMeses: number, diaVencimento: number, valor: number) {
  const primeiroMes = inicio.getUTCDate() <= diaVencimento ? 0 : 1;
  return Array.from({ length: prazoMeses }, (_, i) => ({
    numero: i + 1,
    vencimento: addMeses(inicio, primeiroMes + i, diaVencimento),
    valor,
  }));
}

const chaveData = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Cobrança mensal do contrato: cada ponto gera suas parcelas (valor/início/prazo próprios) e as do mesmo
 * vencimento são somadas em uma só. Valores em centavos para não acumular erro de ponto flutuante.
 */
export function agregarParcelas(pontos: { valor: number; inicio: Date; prazoMeses: number }[], diaVencimento: number) {
  const porData = new Map<string, { vencimento: Date; centavos: number }>();
  for (const p of pontos) {
    for (const x of gerarParcelas(p.inicio, p.prazoMeses, diaVencimento, p.valor)) {
      const k = chaveData(x.vencimento);
      const atual = porData.get(k) ?? { vencimento: x.vencimento, centavos: 0 };
      atual.centavos += Math.round(x.valor * 100);
      porData.set(k, atual);
    }
  }
  return [...porData.values()]
    .sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())
    .map((x, i) => ({ numero: i + 1, vencimento: x.vencimento, valor: x.centavos / 100 }));
}

interface PontoDoContrato {
  valor: unknown;
  inicio: Date;
  prazoMeses: number;
  fim: Date;
}

/** Valor mensal hoje: soma dos pontos vigentes; sem nenhum vigente (futuro/encerrado), a soma de todos. */
export function valorMensalAtual(pontos: PontoDoContrato[], ref = hoje()): number {
  const vigentes = pontos.filter((p) => p.inicio <= ref && ref <= p.fim);
  return (vigentes.length ? vigentes : pontos).reduce((s, p) => s + Number(p.valor), 0);
}

/** Quanto das parcelas em atraso (datas de vencimento) pertence a este ponto. */
export function atrasoDoPonto(p: PontoDoContrato, diaVencimento: number, vencimentosEmAtraso: Date[]): number {
  const meus = new Set(gerarParcelas(p.inicio, p.prazoMeses, diaVencimento, 0).map((x) => chaveData(x.vencimento)));
  return vencimentosEmAtraso.filter((v) => meus.has(chaveData(v))).length * Number(p.valor);
}

/** Parcelas de contratos ativos vencidas e não pagas. */
export const filtroEmAtraso = () => ({
  pagoEm: null,
  vencimento: { lt: hoje() },
  contrato: { status: "ATIVO" as const },
});

export async function resumoFinanceiro() {
  const h = hoje();
  const inicioMes = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 1));
  const fimMes = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() + 1, 0));
  const ativo = { contrato: { status: "ATIVO" as const } };

  const regras = regrasDe(await getConfig());
  const atrasadas = await prisma.parcela.findMany({ where: filtroEmAtraso(), select: { valor: true, vencimento: true } });
  const comEncargos = atrasadas.reduce((s, p) => s + calcularEncargos(Number(p.valor), p.vencimento, regras, h).total, 0);

  const [atraso, previstoMes, recebidoMes, contratosAtivos, pontosOcupados, pontosTotal, despesasPagas, despesasAPagar] = await Promise.all([
    prisma.parcela.aggregate({ where: filtroEmAtraso(), _sum: { valor: true }, _count: true }),
    prisma.parcela.aggregate({
      where: { ...ativo, vencimento: { gte: inicioMes, lte: fimMes } },
      _sum: { valor: true },
    }),
    prisma.parcela.aggregate({
      where: { pagoEm: { gte: inicioMes, lte: fimMes } },
      _sum: { valorPago: true },
    }),
    prisma.contrato.count({ where: { status: "ATIVO" } }),
    prisma.ponto.count({ where: { ativo: true, contratos: { some: { contrato: { status: "ATIVO" } } } } }),
    prisma.ponto.count({ where: { ativo: true } }),
    prisma.despesa.aggregate({ where: { pagoEm: { gte: inicioMes, lte: fimMes } }, _sum: { valorPago: true } }),
    prisma.despesa.aggregate({ where: { pagoEm: null, vencimento: { lte: fimMes } }, _sum: { valor: true }, _count: true }),
  ]);

  return {
    inadimplencia: Number(atraso._sum.valor ?? 0),
    inadimplenciaAtualizada: comEncargos,
    parcelasEmAtraso: atraso._count,
    previstoMes: Number(previstoMes._sum.valor ?? 0),
    recebidoMes: Number(recebidoMes._sum.valorPago ?? 0),
    contratosAtivos,
    pontosOcupados,
    pontosTotal,
    despesasPagasMes: Number(despesasPagas._sum.valorPago ?? 0),
    despesasAPagar: Number(despesasAPagar._sum.valor ?? 0),
    despesasAPagarQtd: despesasAPagar._count,
  };
}

export type StatusParcela = "PAGA" | "ATRASADA" | "A_VENCER";

export function statusParcela(p: { pagoEm: Date | null; vencimento: Date }, ref = hoje()): StatusParcela {
  if (p.pagoEm) return "PAGA";
  return p.vencimento < ref ? "ATRASADA" : "A_VENCER";
}

/** Listas do painel: o que precisa de ação agora. */
export async function alertas() {
  const h = hoje();
  const ativo = { contrato: { status: "ATIVO" as const } };
  const include = { contrato: { include: { cliente: true } } };

  const [atrasadas, aVencer, terminando, despesas, ocorrencias] = await Promise.all([
    prisma.parcela.findMany({ where: filtroEmAtraso(), include, orderBy: { vencimento: "asc" }, take: 15 }),
    prisma.parcela.findMany({
      where: { ...ativo, pagoEm: null, vencimento: { gte: h, lte: addDias(h, 7) } },
      include,
      orderBy: { vencimento: "asc" },
      take: 15,
    }),
    prisma.contratoPonto.findMany({
      where: { contrato: { status: "ATIVO" }, fim: { gte: h, lte: addDias(h, 60) } },
      include: { ponto: true, contrato: { include: { cliente: true } } },
      orderBy: { fim: "asc" },
      take: 15,
    }),
    prisma.despesa.findMany({ where: { pagoEm: null, vencimento: { lte: addDias(h, 7) } }, orderBy: { vencimento: "asc" }, take: 10 }),
    prisma.ocorrencia.findMany({ where: { status: { not: "RESOLVIDA" } }, orderBy: { abertaEm: "asc" }, take: 8, include: { ponto: true } }),
  ]);

  // Reajuste anual: 12 meses depois do último reajuste (ou do início do contrato).
  const ativos = await prisma.contrato.findMany({
    where: { status: "ATIVO" },
    include: { cliente: true, reajustes: { orderBy: { aplicadoEm: "desc" }, take: 1 } },
  });
  const reajustes = ativos
    .map((c) => ({ c, devidoEm: addMeses(c.reajustes[0]?.aplicadoEm ?? c.inicio, 12) }))
    .filter((x) => x.devidoEm <= addDias(h, 30) && x.c.fim > x.devidoEm)
    .sort((a, b) => a.devidoEm.getTime() - b.devidoEm.getTime())
    .slice(0, 10);

  return { atrasadas, aVencer, terminando, despesas, reajustes, ocorrencias };
}

export interface MesFluxo {
  rotulo: string; // "out"
  atual: boolean;
  previsto: number;
  recebido: number;
}

/** Previsto (por vencimento) x recebido (por data de pagamento) de 2 meses atrás até 3 meses à frente. */
export async function fluxoMensal(): Promise<MesFluxo[]> {
  const h = hoje();
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 2 + i, 1));
    return { chave: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, d };
  });
  const inicio = meses[0].d;
  const fim = new Date(Date.UTC(meses[5].d.getUTCFullYear(), meses[5].d.getUTCMonth() + 1, 0));

  const parcelas = await prisma.parcela.findMany({
    where: { OR: [{ vencimento: { gte: inicio, lte: fim } }, { pagoEm: { gte: inicio, lte: fim } }] },
    select: { vencimento: true, valor: true, pagoEm: true, valorPago: true, contrato: { select: { status: true } } },
  });

  const chaveDe = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
  const previsto = new Map<string, number>();
  const recebido = new Map<string, number>();
  for (const p of parcelas) {
    if (p.contrato.status === "ATIVO") previsto.set(chaveDe(p.vencimento), (previsto.get(chaveDe(p.vencimento)) ?? 0) + Number(p.valor));
    if (p.pagoEm) recebido.set(chaveDe(p.pagoEm), (recebido.get(chaveDe(p.pagoEm)) ?? 0) + Number(p.valorPago ?? 0));
  }

  return meses.map(({ chave, d }) => ({
    rotulo: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(d).replace(".", ""),
    atual: chave === chaveDe(h),
    previsto: previsto.get(chave) ?? 0,
    recebido: recebido.get(chave) ?? 0,
  }));
}

export interface MesCaixa {
  chave: string; // "2026-10"
  rotulo: string; // "out/26"
  atual: boolean;
  entradaPrevista: number;
  entradaRealizada: number;
  saidaPrevista: number;
  saidaRealizada: number;
}

/** Fluxo de caixa mês a mês a partir de `inicio` (1º dia do mês). Previsto pelo vencimento, realizado pela data de pagamento. */
export async function fluxoCaixa(inicio: Date, meses: number): Promise<MesCaixa[]> {
  const h = hoje();
  const lista = Array.from({ length: meses }, (_, i) => new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + i, 1)));
  const fim = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + meses, 0));
  const dentro = { gte: inicio, lte: fim };

  const [parcelas, despesas] = await Promise.all([
    prisma.parcela.findMany({
      where: { OR: [{ vencimento: dentro }, { pagoEm: dentro }] },
      select: { vencimento: true, valor: true, pagoEm: true, valorPago: true, contrato: { select: { status: true } } },
    }),
    prisma.despesa.findMany({
      where: { OR: [{ vencimento: dentro }, { pagoEm: dentro }] },
      select: { vencimento: true, valor: true, pagoEm: true, valorPago: true },
    }),
  ]);

  const k = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const soma = (m: Map<string, number>, d: Date, v: number) => m.set(k(d), (m.get(k(d)) ?? 0) + v);
  const [eP, eR, sP, sR] = [new Map<string, number>(), new Map<string, number>(), new Map<string, number>(), new Map<string, number>()];
  for (const p of parcelas) {
    if (p.contrato.status === "ATIVO") soma(eP, p.vencimento, Number(p.valor));
    if (p.pagoEm) soma(eR, p.pagoEm, Number(p.valorPago ?? 0));
  }
  for (const d of despesas) {
    soma(sP, d.vencimento, Number(d.valor));
    if (d.pagoEm) soma(sR, d.pagoEm, Number(d.valorPago ?? 0));
  }

  const fmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
  return lista.map((d) => ({
    chave: k(d),
    rotulo: fmt.format(d).replace(".", "").replace(" de ", "/"),
    atual: k(d) === k(h),
    entradaPrevista: eP.get(k(d)) ?? 0,
    entradaRealizada: eR.get(k(d)) ?? 0,
    saidaPrevista: sP.get(k(d)) ?? 0,
    saidaRealizada: sR.get(k(d)) ?? 0,
  }));
}

/** Despesas vencidas e não pagas. */
export const filtroDespesaEmAtraso = () => ({ pagoEm: null, vencimento: { lt: hoje() } });
