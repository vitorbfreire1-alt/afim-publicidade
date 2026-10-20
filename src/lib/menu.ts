import type { Papel } from "@prisma/client";

export type IconeArea = "painel" | "comercial" | "pontos" | "financeiro" | "admin";

export interface Aba {
  href: string;
  label: string;
  /** Outros caminhos que pertencem a esta aba (ex.: páginas de detalhe). */
  tambem?: string[];
}

export interface Area {
  id: string;
  label: string;
  icone: IconeArea;
  abas: Aba[];
}

const aba = (cond: boolean, a: Aba): Aba[] => (cond ? [a] : []);

/** Menu do sistema: poucas áreas no menu principal, cada uma com suas abas; cada perfil vê só o que pode usar. */
export function montarMenu(papel: Papel): Area[] {
  const dono = papel === "DONO";
  const financeiro = dono || papel === "FINANCEIRO";
  const comercial = dono || papel === "COMERCIAL";

  const areas: Area[] = [
    { id: "painel", label: "Painel", icone: "painel", abas: [{ href: "/", label: "Painel" }] },
    {
      id: "comercial",
      label: "Comercial",
      icone: "comercial",
      abas: [
        { href: "/carteira", label: "Carteira", tambem: ["/contratos"] },
        { href: "/clientes", label: "Clientes" },
        ...aba(comercial, { href: "/propostas", label: "Propostas" }),
      ],
    },
    {
      id: "pontos",
      label: "Pontos",
      icone: "pontos",
      abas: [
        { href: "/pontos", label: "Pontos" },
        { href: "/disponibilidade", label: "Disponibilidade" },
        { href: "/ocorrencias", label: "Manutenção" },
        ...aba(financeiro, { href: "/pontos/lucro", label: "Lucro por ponto" }),
      ],
    },
    {
      id: "financeiro",
      label: "Financeiro",
      icone: "financeiro",
      abas: [
        { href: "/financeiro", label: "A receber", tambem: ["/acordos"] },
        ...aba(financeiro, { href: "/despesas", label: "Despesas" }),
        ...aba(financeiro, { href: "/fluxo", label: "Fluxo de caixa" }),
        { href: "/comissoes", label: "Comissões" },
        ...aba(financeiro, { href: "/indicadores", label: "Metas" }),
        ...aba(financeiro, { href: "/relatorios", label: "Relatórios" }),
      ],
    },
  ];
  if (dono) {
    areas.push({
      id: "admin",
      label: "Admin",
      icone: "admin",
      abas: [
        { href: "/usuarios", label: "Usuários" },
        { href: "/configuracoes", label: "Configurações" },
        { href: "/historico", label: "Histórico" },
        { href: "/dados", label: "Dados e backup" },
      ],
    });
  }
  return areas;
}

const casa = (pathname: string, base: string) => (base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(base + "/"));

/** Aba que melhor corresponde ao caminho (a de prefixo mais longo, ex.: /pontos/lucro vence /pontos). */
export function abaAtiva(area: Area, pathname: string): Aba | null {
  let melhor: { aba: Aba; tam: number } | null = null;
  for (const a of area.abas) {
    for (const base of [a.href, ...(a.tambem ?? [])]) {
      if (casa(pathname, base) && (!melhor || base.length > melhor.tam)) melhor = { aba: a, tam: base.length };
    }
  }
  return melhor?.aba ?? null;
}

export function areaAtiva(areas: Area[], pathname: string): Area | null {
  return areas.find((a) => abaAtiva(a, pathname)) ?? null;
}
