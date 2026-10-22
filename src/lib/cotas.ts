import { addDias, dateBR } from "./format";
import { prisma } from "./prisma";

interface Periodo {
  inicio: Date;
  fim: Date;
  /** Reserva o ponto inteiro: ocupa todas as cotas, não só uma. */
  ocupaTudo?: boolean;
  /** Quantas cotas ocupa quando não reserva o ponto inteiro (1 por padrão). */
  cotasUsadas?: number;
}

/** Quantas cotas um contrato ocupa no ponto: uma, ou todas se reserva o ponto inteiro. */
export const pesoNoPonto = (c: { ocupaTudo?: boolean; cotasUsadas?: number }, cotas: number | null | undefined) =>
  c.ocupaTudo && cotas ? cotas : Math.max(1, c.cotasUsadas ?? 1);

/** Cotas ocupadas numa data (soma dos pesos dos períodos que a cobrem). */
export function ocupadasEm(lista: Periodo[], cotas: number | null | undefined, data: Date): number {
  return lista.filter((c) => c.inicio <= data && data <= c.fim).reduce((s, c) => s + pesoNoPonto(c, cotas), 0);
}

/**
 * Maior número de cotas ocupadas ao mesmo tempo dentro da janela `novo`.
 * Basta olhar o início da janela e os inícios dos outros períodos que caem nela.
 */
export function picoDeOcupacao(existentes: Periodo[], novo: Periodo, cotas?: number | null): number {
  const sobrepostos = existentes.filter((e) => e.inicio <= novo.fim && e.fim >= novo.inicio);
  const instantes = [novo.inicio, ...sobrepostos.map((e) => e.inicio).filter((d) => d > novo.inicio && d <= novo.fim)];
  return Math.max(0, ...instantes.map((t) => sobrepostos.filter((e) => e.inicio <= t && e.fim >= t).reduce((s, e) => s + pesoNoPonto(e, cotas), 0)));
}

/** Janela que uma renovação passa a ocupar: do dia seguinte ao fim atual até o novo fim. */
export const janelaDeRenovacao = (fimAtual: Date, novoFim: Date): Periodo => ({ inicio: addDias(fimAtual, 1), fim: novoFim });

/**
 * Confere se cada ponto com limite de cotas comporta o contrato no período pedido
 * (uma cota, ou todas se reservar o ponto inteiro). Retorna a mensagem do primeiro ponto lotado, ou null se tudo cabe.
 */
export async function verificarCotas(itens: { pontoId: string; inicio: Date; fim: Date; ocupaTudo?: boolean; cotasUsadas?: number }[], ignorarContratoId?: string): Promise<string | null> {
  const pontos = await prisma.ponto.findMany({ where: { id: { in: itens.map((i) => i.pontoId) }, cotas: { not: null } } });
  for (const ponto of pontos) {
    const janela = itens.find((i) => i.pontoId === ponto.id)!;
    const existentes = await prisma.contratoPonto.findMany({
      where: { pontoId: ponto.id, contrato: { status: "ATIVO", ...(ignorarContratoId ? { id: { not: ignorarContratoId } } : {}) } },
      select: { inicio: true, fim: true, ocupaTudo: true, cotasUsadas: true },
    });
    const pico = picoDeOcupacao(existentes, janela, ponto.cotas);
    const novoPeso = pesoNoPonto(janela, ponto.cotas);
    if (pico + novoPeso > ponto.cotas!) {
      return novoPeso > 1
        ? `${ponto.nome} não tem ${novoPeso} cota(s) livres entre ${dateBR(janela.inicio)} e ${dateBR(janela.fim)} (${pico} de ${ponto.cotas} já ocupadas).`
        : `${ponto.nome} está lotado entre ${dateBR(janela.inicio)} e ${dateBR(janela.fim)} (${pico} de ${ponto.cotas} cotas ocupadas).`;
    }
  }
  return null;
}
