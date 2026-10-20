import Link from "next/link";
import { LogOut } from "lucide-react";
import BuscaGlobal from "@/components/BuscaGlobal";
import Logo from "@/components/Logo";
import Nav, { type NavItem } from "@/components/Nav";
import { logout } from "@/app/actions/auth";
import { PAPEL_LABEL, requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const financeiro = user.papel === "DONO" || user.papel === "FINANCEIRO";
  const comercial = user.papel === "DONO" || user.papel === "COMERCIAL";
  const itens = (...x: (NavItem | false)[]) => x.filter((i): i is NavItem => Boolean(i));
  const items: NavItem[] = itens(
    { href: "/", label: "Painel", icone: "painel" },
    { href: "/carteira", label: "Carteira", icone: "carteira" },
    { href: "/financeiro", label: "A receber", icone: "financeiro" },
    { href: "/clientes", label: "Clientes", icone: "clientes" },
    { href: "/pontos", label: "Pontos", icone: "pontos" },
    { href: "/disponibilidade", label: "Disponib.", icone: "disponibilidade" },
    comercial && { href: "/propostas", label: "Propostas", icone: "propostas" },
    { href: "/ocorrencias", label: "Manutenção", icone: "manutencao" },
    financeiro && { href: "/despesas", label: "Despesas", icone: "despesas" },
    financeiro && { href: "/fluxo", label: "Fluxo", icone: "fluxo" },
    { href: "/comissoes", label: "Comissões", icone: "comissoes" },
    financeiro && { href: "/indicadores", label: "Metas", icone: "indicadores" },
    financeiro && { href: "/relatorios", label: "Relatórios", icone: "relatorios" },
    user.papel === "DONO" && { href: "/historico", label: "Histórico", icone: "historico" },
    user.papel === "DONO" && { href: "/usuarios", label: "Usuários", icone: "usuarios" },
    user.papel === "DONO" && { href: "/configuracoes", label: "Config.", icone: "config" },
  );
  const iniciais = user.nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* Menu lateral (computador) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-black/30 px-4 py-6 backdrop-blur-xl lg:flex">
        <Link href="/" aria-label="Painel" className="mb-8 px-2">
          <Logo />
        </Link>
        <BuscaGlobal variante="lateral" />
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-4">
          <Nav items={items} variante="lateral" />
        </div>
        <form action={logout}>
          <div className="card flex items-center gap-3 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-gold-deep text-xs font-bold text-black">
              {iniciais}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold">{user.nome}</span>
              <span className="text-xs text-ink-faint">{PAPEL_LABEL[user.papel]}</span>
            </span>
            <button className="btn btn-sm !min-h-9 !px-2.5" type="submit" aria-label="Sair" title="Sair">
              <LogOut className="size-4" />
            </button>
          </div>
        </form>
      </aside>

      <div className="min-w-0">
        {/* Topo (celular) */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/70 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Link href="/" aria-label="Painel">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {/* Fora do <form> de sair: o Enter da busca não pode acionar o logout. */}
            <BuscaGlobal variante="icone" />
            <form action={logout} className="flex items-center gap-2">
              <span className="text-xs text-ink-soft">{user.nome.split(" ")[0]}</span>
              <button className="btn btn-sm !px-2.5" type="submit" aria-label="Sair">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 lg:px-10 lg:pb-14 lg:pt-10">{children}</div>
      </div>

      {/* Barra inferior (celular) */}
      <Nav items={items} variante="inferior" />
    </div>
  );
}
