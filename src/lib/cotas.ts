import { addDias, dateBR } from "./format";
import { prisma } from "./prisma";

interface Periodo {
  inicio: Date;
  fim: Date;
}

/**
 * Maior número de contratos que ocupam o ponto ao mesmo tempo dentro da janela `novo`.
 * Basta olhar o início da janela e os inícios dos outros períodos que caem nela.
 */
export function picoDeOcupacao(existentes: Periodo[], novo: Periodo): number {
  const sobrepostos = existentes.filter((e) => e.inicio <= novo.fim && e.fim >= novo.inicio);
  const instantes = [novo.inicio, ...sobrepostos.map((e) => e.inicio).filter((d) => d > novo.inicio && d <= novo.fim)];
  return Math.max(0, ...instantes.map((t) => sobrepostos.filter((e) => e.inicio <= t && e.fim >= t).length));
}

/** Janela que uma renovação passa a ocupar: do dia seguinte ao fim atual até o novo fim. */
export const janelaDeRenovacao = (fimAtual: Date, novoFim: Date): Periodo => ({ inicio: addDias(fimAtual, 1), fim: novoFim });

/**
 * Confere se cada ponto com limite de cotas comporta mais um contrato no período pedido.
 * Retorna a mensagem do primeiro ponto lotado, ou null se tudo cabe.
 */
export async function verificarCotas(itens: { pontoId: string; inicio: Date; fim: Date }[], ignorarContratoId?: string): Promise<string | null> {
  const pontos = await prisma.ponto.findMany({ where: { id: { in: itens.map((i) => i.pontoId) }, cotas: { not: null } } });
  for (const ponto of pontos) {
    const janela = itens.find((i) => i.pontoId === ponto.id)!;
    const existentes = await prisma.contratoPonto.findMany({
      where: { pontoId: ponto.id, contrato: { status: "ATIVO", ...(ignorarContratoId ? { id: { not: ignorarContratoId } } : {}) } },
      select: { inicio: true, fim: true },
    });
    const pico = picoDeOcupacao(existentes, janela);
    if (pico >= ponto.cotas!) {
      return `${ponto.nome} está lotado entre ${dateBR(janela.inicio)} e ${dateBR(janela.fim)} (${pico} de ${ponto.cotas} cotas ocupadas).`;
    }
  }
  return null;
}
