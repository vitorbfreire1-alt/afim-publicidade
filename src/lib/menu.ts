import type { Papel } from "@prisma/client";
import { pode, type Permissao } from "./permissoes";

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

/** Menu do sistema: poucas áreas, cada uma com as abas que a pessoa tem permissão de ver (área sem abas some). */
export function montarMenu(user: { papel: Papel; permissoes: readonly string[] }): Area[] {
  const ok = (p: Permissao) => pode(user, p);

  const areas: Area[] = [
    { id: "painel", label: "Painel", icone: "painel", abas: [{ href: "/", label: "Painel" }] },
    {
      id: "comercial",
      label: "Comercial",
      icone: "comercial",
      abas: [
        ...aba(ok("carteira"), { href: "/carteira", label: "Carteira", tambem: ["/contratos"] }),
        ...aba(ok("clientes"), { href: "/clientes", label: "Clientes" }),
        ...aba(ok("propostas"), { href: "/propostas", label: "Propostas" }),
      ],
    },
    {
      id: "pontos",
      label: "Pontos",
      icone: "pontos",
      abas: [
        ...aba(ok("pontos"), { href: "/pontos", label: "Pontos" }),
        ...aba(ok("disponibilidade"), { href: "/disponibilidade", label: "Disponibilidade" }),
        ...aba(ok("manutencao"), { href: "/ocorrencias", label: "Manutenção" }),
        ...aba(ok("lucro"), { href: "/pontos/lucro", label: "Lucro por ponto" }),
      ],
    },
    {
      id: "financeiro",
      label: "Financeiro",
      icone: "financeiro",
      abas: [
        ...aba(ok("receber"), { href: "/financeiro", label: "A receber", tambem: ["/acordos"] }),
        ...aba(ok("despesas"), { href: "/despesas", label: "Despesas" }),
        ...aba(ok("fluxo"), { href: "/fluxo", label: "Fluxo de caixa" }),
        ...aba(ok("comissoes"), { href: "/comissoes", label: "Comissões" }),
        ...aba(ok("metas"), { href: "/indicadores", label: "Metas" }),
        ...aba(ok("relatorios"), { href: "/relatorios", label: "Relatórios" }),
      ],
    },
  ];
  if (user.papel === "DONO") {
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
  return areas.filter((a) => a.abas.length > 0);
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
