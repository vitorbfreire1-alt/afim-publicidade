"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Briefcase,
  ChartNoAxesColumn,
  CircleDollarSign,
  Ellipsis,
  LayoutDashboard,
  MapPin,
  Receipt,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONES: Record<string, LucideIcon> = {
  painel: LayoutDashboard,
  carteira: Briefcase,
  financeiro: CircleDollarSign,
  clientes: Users,
  pontos: MapPin,
  usuarios: ShieldCheck,
  despesas: Receipt,
  fluxo: ChartNoAxesColumn,
};

export interface NavItem {
  href: string;
  label: string;
  icone: keyof typeof ICONES;
  /** Na barra do celular, só os principais ficam visíveis; o resto vai para "Mais". */
  principal?: boolean;
}

/** `lateral`: menu do computador. `inferior`: barra fixa de app no celular. */
export default function Nav({ items, variante }: { items: NavItem[]; variante: "lateral" | "inferior" }) {
  const pathname = usePathname();
  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  if (variante === "inferior") {
    return <BarraInferior items={items} ativo={ativo} />;
  }

  return (
    <nav aria-label="Principal" className="flex flex-col gap-1">
      {items.map((it) => {
        const Icone = ICONES[it.icone];
        const on = ativo(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
              on
                ? "bg-gradient-to-r from-gold/20 to-transparent text-gold-soft"
                : "text-ink-soft hover:bg-white/5 hover:text-ink"
            }`}
          >
            {on && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold shadow-[0_0_10px_var(--gold)]" />}
            <Icone className="size-[1.1rem]" strokeWidth={on ? 2.3 : 1.8} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

function BarraInferior({ items, ativo }: { items: NavItem[]; ativo: (href: string) => boolean }) {
  const [aberto, setAberto] = useState(false);
  const principais = items.filter((i) => i.principal !== false).slice(0, items.length > 5 ? 4 : 5);
  const extras = items.filter((i) => !principais.includes(i));
  const extraAtivo = extras.some((i) => ativo(i.href));

  const classe = (on: boolean) =>
    `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.62rem] font-semibold transition-colors ${on ? "bg-gold/15 text-gold-soft" : "text-ink-faint"}`;

  return (
    <>
      {aberto && (
        <button aria-label="Fechar menu" className="fixed inset-0 z-20 cursor-default lg:hidden" onClick={() => setAberto(false)} />
      )}
      {aberto && extras.length > 0 && (
        <div className="fixed inset-x-3 bottom-[5.25rem] z-30 lg:hidden">
          <div className="card grid grid-cols-3 gap-1 !bg-[#0c0c10] p-2">
            {extras.map((it) => {
              const Icone = ICONES[it.icone];
              return (
                <Link key={it.href} href={it.href} onClick={() => setAberto(false)} className={classe(ativo(it.href))}>
                  <Icone className="size-[1.15rem]" />
                  <span className="truncate">{it.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      <nav
        aria-label="Principal"
        className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl border border-line bg-[#0c0c10]/85 p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        {principais.map((it) => {
          const Icone = ICONES[it.icone];
          const on = ativo(it.href);
          return (
            <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined} className={classe(on)} onClick={() => setAberto(false)}>
              <Icone className="size-[1.15rem]" strokeWidth={on ? 2.4 : 1.8} />
              <span className="truncate">{it.label}</span>
            </Link>
          );
        })}
        {extras.length > 0 && (
          <button type="button" aria-expanded={aberto} onClick={() => setAberto((v) => !v)} className={classe(extraAtivo || aberto)}>
            <Ellipsis className="size-[1.15rem]" />
            <span>Mais</span>
          </button>
        )}
      </nav>
    </>
  );
}
