import type { StatusRenovacao } from "@prisma/client";
import { diasEntre, hoje } from "./format";

export type Nivel = "critico" | "alerta" | "atencao";

/** Limites (em dias) das faixas de urgência de fim de contrato. */
export const LIMITES = { critico: 15, alerta: 30, atencao: 60 } as const;

/** Dias que faltam para o fim (negativo = já terminou). */
export const diasRestantes = (fim: Date, ref = hoje()) => diasEntre(ref, fim);

export function nivelDe(dias: number): Nivel | null {
  if (dias <= LIMITES.critico) return "critico";
  if (dias <= LIMITES.alerta) return "alerta";
  if (dias <= LIMITES.atencao) return "atencao";
  return null;
}

export function textoPrazo(dias: number): string {
  if (dias < 0) return `terminou há ${-dias} dia${dias === -1 ? "" : "s"}`;
  if (dias === 0) return "termina hoje";
  return `termina em ${dias} dia${dias === 1 ? "" : "s"}`;
}

/** Cor do selo: vermelho (pisca), laranja e dourado. */
export const COR_NIVEL: Record<Nivel, string> = { critico: "text-danger selo-critico", alerta: "text-warn", atencao: "text-gold-soft" };

export const STATUS_RENOVACAO: StatusRenovacao[] = ["A_CONTATAR", "EM_NEGOCIACAO", "VAI_RENOVAR", "NAO_RENOVA"];
export const RENOVACAO_LABEL: Record<StatusRenovacao, string> = {
  A_CONTATAR: "A contatar",
  EM_NEGOCIACAO: "Em negociação",
  VAI_RENOVAR: "Vai renovar",
  NAO_RENOVA: "Não vai renovar",
};
