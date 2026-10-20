import type { Papel } from "@prisma/client";

/** Tudo o que o Dono pode liberar ou bloquear, pessoa a pessoa. */
export const PERMISSOES = [
  "clientes", "carteira", "propostas", "editar",
  "pontos", "disponibilidade", "manutencao",
  "valores", "receber", "baixar", "despesas", "fluxo", "metas", "relatorios", "lucro", "comissoes",
] as const;

export type Permissao = (typeof PERMISSOES)[number];

export interface GrupoPermissoes {
  titulo: string;
  itens: { chave: Permissao; rotulo: string; ajuda?: string }[];
}

/** Como as permissões aparecem na tela de usuários. */
export const GRUPOS_PERMISSOES: GrupoPermissoes[] = [
  {
    titulo: "Comercial",
    itens: [
      { chave: "clientes", rotulo: "Ver clientes" },
      { chave: "carteira", rotulo: "Ver carteira e contratos", ajuda: "Sem valores em R$, se a permissão de valores estiver desmarcada." },
      { chave: "propostas", rotulo: "Propostas (criar e acompanhar)", ajuda: "Inclui ver os valores." },
      { chave: "editar", rotulo: "Criar e editar clientes, pontos e contratos", ajuda: "Contratos também exigem ver valores." },
    ],
  },
  {
    titulo: "Pontos",
    itens: [
      { chave: "pontos", rotulo: "Ver pontos de mídia" },
      { chave: "disponibilidade", rotulo: "Ver disponibilidade" },
      { chave: "manutencao", rotulo: "Manutenção (ver e registrar ocorrências)" },
    ],
  },
  {
    titulo: "Financeiro",
    itens: [
      { chave: "valores", rotulo: "Ver valores em R$ (contratos, parcelas, inadimplência)", ajuda: "Sem esta, a pessoa não vê nenhum valor em dinheiro." },
      { chave: "receber", rotulo: "A receber (consultar parcelas e atrasos)" },
      { chave: "baixar", rotulo: "Registrar recebimentos, editar parcelas e fazer acordos" },
      { chave: "despesas", rotulo: "Despesas" },
      { chave: "fluxo", rotulo: "Fluxo de caixa" },
      { chave: "comissoes", rotulo: "Comissões", ajuda: "Sem registrar recebimentos, vê só as próprias." },
      { chave: "metas", rotulo: "Metas e indicadores" },
      { chave: "relatorios", rotulo: "Relatórios e exportações em Excel" },
      { chave: "lucro", rotulo: "Lucro por ponto" },
    ],
  },
];

export type ModeloId = "DONO" | "FINANCEIRO" | "COMERCIAL" | "FUNCIONARIO";

export interface Modelo {
  id: ModeloId;
  rotulo: string;
  descricao: string;
  papel: Papel;
  permissoes: Permissao[];
}

/** Pontos de partida: escolha um e depois ajuste as caixas. */
export const MODELOS: Modelo[] = [
  {
    id: "FUNCIONARIO",
    rotulo: "Funcionário (sem financeiro)",
    descricao: "Vê clientes, contratos (sem valores), pontos e manutenção. Não vê nenhum valor em dinheiro.",
    papel: "COMERCIAL",
    permissoes: ["clientes", "carteira", "editar", "pontos", "disponibilidade", "manutencao"],
  },
  {
    id: "COMERCIAL",
    rotulo: "Comercial",
    descricao: "Clientes, contratos, propostas e pontos, com valores. Consulta o A receber.",
    papel: "COMERCIAL",
    permissoes: ["clientes", "carteira", "propostas", "editar", "pontos", "disponibilidade", "manutencao", "valores", "receber", "comissoes"],
  },
  {
    id: "FINANCEIRO",
    rotulo: "Financeiro",
    descricao: "Recebimentos, despesas, fluxo de caixa, relatórios e metas. Não cria contratos.",
    papel: "FINANCEIRO",
    permissoes: ["clientes", "carteira", "pontos", "disponibilidade", "manutencao", "valores", "receber", "baixar", "despesas", "fluxo", "comissoes", "metas", "relatorios", "lucro"],
  },
  {
    id: "DONO",
    rotulo: "Dono (acesso total)",
    descricao: "Tudo, inclusive usuários, configurações, histórico e backup.",
    papel: "DONO",
    permissoes: [...PERMISSOES],
  },
];

/** Quem tem alguma destas precisa ver os valores; e quem registra recebimentos precisa consultar o A receber. */
const EXIGEM_VALORES: Permissao[] = ["propostas", "receber", "baixar", "despesas", "fluxo", "metas", "relatorios", "lucro", "comissoes"];

/** Mantém só chaves válidas e acrescenta as que decorrem de outras (ex.: despesas → valores). */
export function normalizar(lista: string[]): Permissao[] {
  const set = new Set<Permissao>(PERMISSOES.filter((p) => lista.includes(p)));
  if (set.has("baixar")) set.add("receber");
  if (EXIGEM_VALORES.some((p) => set.has(p))) set.add("valores");
  return PERMISSOES.filter((p) => set.has(p));
}

export function permissoesDe(papel: Papel, lista: string[]): Permissao[] {
  return papel === "DONO" ? [...PERMISSOES] : normalizar(lista);
}

/** Nome do perfil para mostrar: o do modelo, se bater exatamente, senão "Personalizado". */
export function rotuloPerfil(papel: Papel, lista: string[]): string {
  if (papel === "DONO") return "Dono";
  const atual = normalizar(lista);
  const modelo = MODELOS.find((m) => m.id !== "DONO" && m.permissoes.length === atual.length && m.permissoes.every((p) => atual.includes(p)));
  return modelo ? modelo.rotulo.replace(/ \(.*\)$/, "") : "Personalizado";
}

export const NOME_PERMISSAO: Record<Permissao, string> = Object.fromEntries(
  GRUPOS_PERMISSOES.flatMap((g) => g.itens.map((i) => [i.chave, i.rotulo])),
) as Record<Permissao, string>;

/** O Dono tem tudo; os demais precisam ter TODAS as permissões pedidas. (Módulo puro: pode ir ao navegador.) */
export const pode = (user: { papel: Papel; permissoes: readonly string[] }, ...exigidas: Permissao[]) =>
  user.papel === "DONO" || exigidas.every((p) => user.permissoes.includes(p));
