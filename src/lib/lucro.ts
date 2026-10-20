import { gerarParcelas } from "./financeiro";
import { prisma } from "./prisma";

export interface LucroPonto {
  pontoId: string;
  receita: number;
  despesas: number;
  lucro: number;
  margem: number | null; // % sobre a receita; nulo sem receita
}

const chave = (d: Date) => d.toISOString().slice(0, 10);
const arred = (n: number) => Math.round(n * 100) / 100;

/**
 * Lucro por ponto no período (datas de pagamento).
 * Receita: cada parcela recebida é repartida entre os pontos que ela cobre, proporcional ao valor de cada um.
 * Despesas: as pagas que foram ligadas ao ponto. O que não tem ponto vai em `geral`.
 */
export async function lucroPorPonto(inicio: Date, fim: Date) {
  const [parcelas, despesas] = await Promise.all([
    prisma.parcela.findMany({
      where: { pagoEm: { gte: inicio, lte: fim } },
      select: {
        valorPago: true,
        vencimento: true,
        contrato: { select: { diaVencimento: true, pontos: { select: { pontoId: true, valor: true, inicio: true, prazoMeses: true } } } },
      },
    }),
    prisma.despesa.findMany({ where: { pagoEm: { gte: inicio, lte: fim } }, select: { pontoId: true, valorPago: true } }),
  ]);

  const receita = new Map<string, number>();
  for (const p of parcelas) {
    const ativos = p.contrato.pontos.filter((cp) =>
      gerarParcelas(cp.inicio, cp.prazoMeses, p.contrato.diaVencimento, 0).some((x) => chave(x.vencimento) === chave(p.vencimento)),
    );
    const alvo = ativos.length ? ativos : p.contrato.pontos;
    const soma = alvo.reduce((s, cp) => s + Number(cp.valor), 0) || 1;
    for (const cp of alvo) {
      receita.set(cp.pontoId, (receita.get(cp.pontoId) ?? 0) + (Number(p.valorPago ?? 0) * Number(cp.valor)) / soma);
    }
  }

  const gasto = new Map<string, number>();
  let geral = 0;
  for (const d of despesas) {
    const v = Number(d.valorPago ?? 0);
    if (d.pontoId) gasto.set(d.pontoId, (gasto.get(d.pontoId) ?? 0) + v);
    else geral += v;
  }

  const ids = new Set([...receita.keys(), ...gasto.keys()]);
  const pontos: LucroPonto[] = [...ids].map((pontoId) => {
    const r = arred(receita.get(pontoId) ?? 0);
    const d = arred(gasto.get(pontoId) ?? 0);
    return { pontoId, receita: r, despesas: d, lucro: arred(r - d), margem: r > 0 ? arred(((r - d) / r) * 100) : null };
  });
  return { pontos, geral: arred(geral) };
}

/** Janela dos últimos N meses até hoje (início no dia 1). */
export function ultimosMeses(n: number, ref: Date) {
  return { inicio: new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - (n - 1), 1)), fim: ref };
}
