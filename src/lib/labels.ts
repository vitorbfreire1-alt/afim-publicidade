import type { FormaPagamento, StatusContrato, TipoMidia } from "@prisma/client";

export const TIPOS: TipoMidia[] = ["LED", "TOTEM", "TRIEDRO", "OUTDOOR"];

export const TIPO_LABEL: Record<TipoMidia, string> = {
  LED: "Painéis de LED",
  TOTEM: "Totens",
  TRIEDRO: "Triedros",
  OUTDOOR: "Outdoors",
};

export const TIPO_SINGULAR: Record<TipoMidia, string> = {
  LED: "Painel de LED",
  TOTEM: "Totem",
  TRIEDRO: "Triedro",
  OUTDOOR: "Outdoor",
};

export const FORMAS: FormaPagamento[] = ["PIX", "BOLETO", "TRANSFERENCIA", "CARTAO", "DINHEIRO", "OUTRO"];

export const FORMA_LABEL: Record<FormaPagamento, string> = {
  PIX: "PIX",
  BOLETO: "Boleto",
  TRANSFERENCIA: "Transferência",
  CARTAO: "Cartão",
  DINHEIRO: "Dinheiro",
  OUTRO: "Outro",
};

export const STATUS_CONTRATO_LABEL: Record<StatusContrato, string> = {
  ATIVO: "Ativo",
  ENCERRADO: "Encerrado",
  CANCELADO: "Cancelado",
};

export const isTipo = (v: unknown): v is TipoMidia => TIPOS.includes(v as TipoMidia);
