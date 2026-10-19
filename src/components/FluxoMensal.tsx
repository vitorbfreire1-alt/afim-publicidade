import type { MesFluxo } from "@/lib/financeiro";
import { money } from "@/lib/format";

const curto = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v > 0 ? String(Math.round(v)) : "");

/** Barras SVG: previsto (contorno) x recebido (ouro) por mês. Sem biblioteca, adapta-se à largura. */
export default function FluxoMensal({ meses }: { meses: MesFluxo[] }) {
  const maior = Math.max(1, ...meses.flatMap((m) => [m.previsto, m.recebido]));
  const W = 480, H = 220, base = 188, topo = 28, larg = W / meses.length;
  const altura = (v: number) => ((base - topo) * v) / maior;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Recebido e previsto por mês" className="mx-auto max-h-72 w-full">
        <defs>
          <linearGradient id="ouro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3d47a" />
            <stop offset="100%" stopColor="#9a7416" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={base - (base - topo) * f} y2={base - (base - topo) * f} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" />
        ))}
        {meses.map((m, i) => {
          const x = i * larg + larg / 2;
          const bw = Math.min(24, larg / 3.2);
          return (
            <g key={i}>
              <title>{`${m.rotulo}: previsto ${money(m.previsto)} · recebido ${money(m.recebido)}`}</title>
              <rect x={x - bw - 2} y={base - altura(m.previsto)} width={bw} height={Math.max(altura(m.previsto), 0)} rx="4" fill="rgba(255,255,255,0.07)" stroke="rgba(243,212,122,0.45)" strokeWidth="1" />
              <rect x={x + 2} y={base - altura(m.recebido)} width={bw} height={Math.max(altura(m.recebido), 0)} rx="4" fill="url(#ouro)" />
              <text x={x - bw / 2 - 2} y={base - altura(m.previsto) - 6} textAnchor="middle" fontSize="12" fill="#b9b2a2">{curto(m.previsto)}</text>
              <text x={x + bw / 2 + 2} y={base - altura(m.recebido) - 6} textAnchor="middle" fontSize="12" fill="#f3d47a" fontWeight="600">{curto(m.recebido)}</text>
              <text x={x} y={H - 8} textAnchor="middle" fontSize="13" fontWeight={m.atual ? 700 : 500} fill={m.atual ? "#f3d47a" : "#7f796d"} style={{ textTransform: "uppercase" }}>
                {m.rotulo}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm border border-gold-soft/50 bg-white/10" /> Previsto</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-gold" /> Recebido</span>
      </figcaption>
    </figure>
  );
}
