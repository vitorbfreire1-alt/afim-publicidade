import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { money } from "@/lib/format";
import { LIMITES } from "@/lib/vencimento";

export interface FaixaVencimento {
  ate: number;
  quantidade: number;
  valor: number;
}

/** Faixa de destaque no painel: quantos pontos de contrato terminam em 15, 30 e 60 dias. Some se não há nada a renovar. */
export default function BannerVencimentos({ faixas, verValores }: { faixas: FaixaVencimento[]; verValores: boolean }) {
  const [f15, f30, f60] = faixas;
  if (f60.quantidade === 0) return null;
  const cor = f15.quantidade > 0 ? "border-danger/60 bg-danger/10" : f30.quantidade > 0 ? "border-warn/60 bg-warn/10" : "border-gold/40 bg-gold/10";
  const titulo = f15.quantidade > 0 ? "text-danger" : f30.quantidade > 0 ? "text-warn" : "text-gold-soft";
  return (
    <Link href="/renovacoes" className={`card rise mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 border p-4 transition hover:brightness-110 ${cor}`}>
      <span className={`flex items-center gap-2 font-semibold ${titulo} ${f15.quantidade > 0 ? "selo-critico" : ""}`}>
        <CalendarClock className="size-5" /> Contratos perto de vencer
      </span>
      <span className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {[[LIMITES.critico, f15, "text-danger"], [LIMITES.alerta, f30, "text-warn"], [LIMITES.atencao, f60, "text-gold-soft"]].map(([lim, f, c]) => (
          <span key={String(lim)}>
            <strong className={`font-display text-lg ${c as string}`}>{(f as FaixaVencimento).quantidade}</strong>{" "}
            <span className="text-ink-soft">em até {String(lim)} dias</span>
          </span>
        ))}
      </span>
      {verValores && <span className="text-xs text-ink-soft sm:ml-auto">{money(f60.valor)}/mês em risco · ver renovações →</span>}
      {!verValores && <span className="text-xs text-ink-soft sm:ml-auto">ver renovações →</span>}
    </Link>
  );
}
