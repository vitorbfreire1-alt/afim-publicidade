"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, CircleDollarSign, LayoutDashboard, MapPin, Settings, type LucideIcon } from "lucide-react";
import { areaAtiva, type Area, type IconeArea } from "@/lib/menu";

const ICONES: Record<IconeArea, LucideIcon> = {
  painel: LayoutDashboard,
  comercial: Briefcase,
  pontos: MapPin,
  financeiro: CircleDollarSign,
  admin: Settings,
};

/** `lateral`: menu do computador. `inferior`: barra fixa de app no celular. Cada item leva à 1ª aba da área. */
export default function Nav({ areas, variante }: { areas: Area[]; variante: "lateral" | "inferior" }) {
  const pathname = usePathname();
  const atual = areaAtiva(areas, pathname);

  if (variante === "inferior") {
    return (
      <nav
        aria-label="Principal"
        className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl border border-line bg-[#0c0c10]/85 p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        {areas.map((a) => {
          const Icone = ICONES[a.icone];
          const on = atual?.id === a.id;
          return (
            <Link
              key={a.id}
              href={a.abas[0].href}
              aria-current={on ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.62rem] font-semibold transition-colors ${on ? "bg-gold/15 text-gold-soft" : "text-ink-faint"}`}
            >
              <Icone className="size-[1.2rem]" strokeWidth={on ? 2.4 : 1.8} />
              <span className="truncate">{a.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Principal" className="flex flex-col gap-1">
      {areas.map((a) => {
        const Icone = ICONES[a.icone];
        const on = atual?.id === a.id;
        return (
          <Link
            key={a.id}
            href={a.abas[0].href}
            aria-current={on ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
              on ? "bg-gradient-to-r from-gold/20 to-transparent text-gold-soft" : "text-ink-soft hover:bg-white/5 hover:text-ink"
            }`}
          >
            {on && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold shadow-[0_0_10px_var(--gold)]" />}
            <Icone className="size-[1.15rem]" strokeWidth={on ? 2.3 : 1.8} />
            {a.label}
          </Link>
        );
      })}
    </nav>
  );
}
