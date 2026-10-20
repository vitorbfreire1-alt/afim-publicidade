import type { CategoriaDespesa, CustoItem, FormaPagamento, StatusContrato, TipoMidia } from "@prisma/client";

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

export const CATEGORIAS: CategoriaDespesa[] = ["ENERGIA", "MANUTENCAO", "ALUGUEL_PONTO", "IMPOSTOS", "COMISSOES", "FOLHA", "MARKETING", "PRODUCAO", "OUTROS"];

export const CATEGORIA_LABEL: Record<CategoriaDespesa, string> = {
  ENERGIA: "Energia",
  MANUTENCAO: "Manutenção",
  ALUGUEL_PONTO: "Aluguel do ponto",
  IMPOSTOS: "Impostos",
  COMISSOES: "Comissões",
  FOLHA: "Folha / equipe",
  MARKETING: "Marketing",
  PRODUCAO: "Produção / montagem",
  OUTROS: "Outros",
};

export const CUSTO_ITENS: CustoItem[] = ["IMPRESSAO", "LONA", "COLAGEM", "MONTAGEM", "RASPAGEM"];

export const CUSTO_LABEL: Record<CustoItem, string> = {
  IMPRESSAO: "Impressão",
  LONA: "Lona",
  COLAGEM: "Colagem da impressão",
  MONTAGEM: "Montagem da lona",
  RASPAGEM: "Raspagem / papel",
};

/** Itens cobrados a cada troca de arte (os demais são da instalação). */
export const CUSTO_TROCA: CustoItem[] = ["IMPRESSAO", "COLAGEM", "RASPAGEM"];
