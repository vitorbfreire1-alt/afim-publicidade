"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { abaAtiva, areaAtiva, type Area } from "@/lib/menu";

/** Abas da área em que o usuário está (ex.: Financeiro → A receber · Despesas · Fluxo de caixa…). */
export default function SubNav({ areas }: { areas: Area[] }) {
  const pathname = usePathname();
  const area = areaAtiva(areas, pathname);
  if (!area || area.abas.length < 2) return null;
  const atual = abaAtiva(area, pathname);

  return (
    <nav aria-label={`Seções de ${area.label}`} className="no-print -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 lg:mx-0 lg:px-0">
      {area.abas.map((a) => {
        const on = atual?.href === a.href;
        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={on ? "page" : undefined}
            className={`relative whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition-colors ${on ? "text-gold-soft" : "text-ink-faint hover:text-ink"}`}
          >
            {a.label}
            {on && <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gold shadow-[0_0_8px_var(--gold)]" />}
          </Link>
        );
      })}
    </nav>
  );
}
