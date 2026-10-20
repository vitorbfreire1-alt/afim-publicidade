import type { Prisma } from "@prisma/client";


type Tx = Prisma.TransactionClient;

/** Chave de mês ("2026-11"): parcelas são localizadas pelo mês, para continuar valendo se o dia de vencimento mudar. */
export const chaveMes = (d: Date) => d.toISOString().slice(0, 7);

/** Parcela "normal" (fora de acordo e não renegociada) de um mês, ou undefined. */
export function parcelaDoMes<T extends { vencimento: Date; acordoId: string | null; renegociadaEm: Date | null }>(lista: T[], vencimento: Date): T | undefined {
  return lista.find((p) => !p.acordoId && !p.renegociadaEm && chaveMes(p.vencimento) === chaveMes(vencimento));
}

/**
 * Soma novas cobranças ao calendário do contrato: se já existe parcela (não paga) no mesmo vencimento, aumenta o valor;
 * senão cria uma nova. No fim, renumera tudo por data de vencimento (1..n).
 * Quem chama garante antes que nenhum vencimento novo cai em parcela já recebida.
 */
export async function somarParcelas(tx: Tx, contratoId: string, novas: { vencimento: Date; valor: number }[]) {
  // Contrato de permuta não gera cobrança.
  const contrato = await tx.contrato.findUnique({ where: { id: contratoId }, select: { formaPagamento: true } });
  if (contrato?.formaPagamento === "PERMUTA") return;
  const existentes = await tx.parcela.findMany({ where: { contratoId } });

  let provisorio = 2_000_000;
  for (const n of novas) {
    const atual = parcelaDoMes(existentes, n.vencimento);
    if (atual) {
      await tx.parcela.update({ where: { id: atual.id }, data: { valor: { increment: n.valor } } });
    } else {
      await tx.parcela.create({ data: { contratoId, numero: provisorio++, vencimento: n.vencimento, valor: n.valor } });
    }
  }

  await renumerarParcelas(tx, contratoId);
}

/** Renumera as parcelas do contrato (1..n) por data de vencimento. */
export async function renumerarParcelas(tx: Tx, contratoId: string) {
  // Duas fases para não esbarrar na unicidade (contratoId, numero) durante a renumeração.
  await tx.parcela.updateMany({ where: { contratoId, numero: { lt: 1_000_000 } }, data: { numero: { increment: 1_000_000 } } });
  const todas = await tx.parcela.findMany({ where: { contratoId }, orderBy: [{ vencimento: "asc" }, { numero: "asc" }], select: { id: true } });
  for (const [i, p] of todas.entries()) {
    await tx.parcela.update({ where: { id: p.id }, data: { numero: i + 1 } });
  }
}

/** Início e fim do contrato = menor início e maior fim entre os pontos. */
export async function recalcularPeriodo(tx: Tx, contratoId: string) {
  const pontos = await tx.contratoPonto.findMany({ where: { contratoId } });
  if (!pontos.length) return;
  await tx.contrato.update({
    where: { id: contratoId },
    data: {
      inicio: new Date(Math.min(...pontos.map((p) => p.inicio.getTime()))),
      fim: new Date(Math.max(...pontos.map((p) => p.fim.getTime()))),
    },
  });
}

/** Primeiro vencimento novo que cai em parcela já recebida (null se não houver). */
export function choqueComRecebida(novas: { vencimento: Date }[], recebidas: { vencimento: Date; pagoEm: Date | null }[]) {
  const pagas = new Set(recebidas.filter((p) => p.pagoEm).map((p) => chaveMes(p.vencimento)));
  return novas.find((n) => pagas.has(chaveMes(n.vencimento))) ?? null;
}

