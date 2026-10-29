import { addDias } from "./format";
import { calcularFim } from "./financeiro";

export type UnidadePrazo = "meses" | "bisemanas";

export const UNIDADES: UnidadePrazo[] = ["meses", "bisemanas"];

/** Aceita só as unidades conhecidas; qualquer outra coisa vira "meses". */
export const unidadeDe = (v: FormDataEntryValue | null): UnidadePrazo => (v === "bisemanas" ? "bisemanas" : "meses");

export const MAX_PRAZO: Record<UnidadePrazo, number> = { meses: 120, bisemanas: 260 };

const arred = (n: number) => Math.round(n * 100) / 100;

/**
 * Converte "quantidade + unidade + valor informado" no que o sistema guarda (prazo em meses, data de fim e valor mensal).
 * Em meses: o valor informado já é mensal. Em bi-semanas (14 dias cada): o valor informado é por bi-semana,
 * e o valor mensal é o total (valor × bi-semanas) dividido pelos meses de cobrança.
 */
export function calcularPrazo(inicio: Date, quantidade: number, unidade: UnidadePrazo, valor: number) {
  if (unidade === "meses") return { prazoMeses: quantidade, fim: calcularFim(inicio, quantidade), valorMensal: valor };
  const dias = quantidade * 14;
  const prazoMeses = Math.max(1, Math.round(dias / 30.4));
  return { prazoMeses, fim: addDias(inicio, dias - 1), valorMensal: arred((valor * quantidade) / prazoMeses) };
}
