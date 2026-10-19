import Link from "next/link";
import Logo from "@/components/Logo";
import Nav, { type NavItem } from "@/components/Nav";
import { logout } from "@/app/actions/auth";
import { PAPEL_LABEL, requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const items: NavItem[] = [
    { href: "/", label: "Painel" },
    { href: "/carteira", label: "Carteira" },
    { href: "/financeiro", label: "Financeiro" },
    { href: "/clientes", label: "Clientes" },
    { href: "/pontos", label: "Pontos" },
    ...(user.papel === "DONO" ? [{ href: "/usuarios", label: "Usuários" }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-line bg-bg/95 px-4 pt-3 backdrop-blur sm:mx-0 sm:px-0">
        <div className="mb-2 flex items-center justify-between">
          <Link href="/" aria-label="Painel">
            <Logo />
          </Link>
          <form action={logout} className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-soft sm:inline">
              {user.nome} · {PAPEL_LABEL[user.papel]}
            </span>
            <button className="btn btn-sm" type="submit">Sair</button>
          </form>
        </div>
        <Nav items={items} />
      </header>
      {children}
    </div>
  );
}
