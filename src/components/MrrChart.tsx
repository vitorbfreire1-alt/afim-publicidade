import { money } from "@/lib/format";

const curto = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v > 0 ? String(Math.round(v)) : "");

/** Evolução mensal da receita recorrente (barras SVG). */
export default function MrrChart({ meses }: { meses: { rotulo: string; valor: number; atual: boolean }[] }) {
  const maior = Math.max(1, ...meses.map((m) => m.valor));
  const W = 560, H = 200, base = 168, topo = 24, larg = W / meses.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Receita recorrente por mês" className="mx-auto max-h-60 w-full">
      <defs><linearGradient id="mrr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f3d47a" /><stop offset="100%" stopColor="#9a7416" /></linearGradient></defs>
      {[0.5, 1].map((f) => <line key={f} x1="0" x2={W} y1={base - (base - topo) * f} y2={base - (base - topo) * f} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" />)}
      {meses.map((m, i) => {
        const x = i * larg + larg / 2;
        const h = ((base - topo) * m.valor) / maior;
        return (
          <g key={i}>
            <title>{`${m.rotulo}: ${money(m.valor)}`}</title>
            <rect x={x - 11} y={base - h} width={22} height={Math.max(h, 0)} rx="4" fill="url(#mrr)" fillOpacity={m.atual ? 1 : 0.6} />
            <text x={x} y={base - h - 5} textAnchor="middle" fontSize="11" fill="#f3d47a">{curto(m.valor)}</text>
            <text x={x} y={H - 8} textAnchor="middle" fontSize="11" fontWeight={m.atual ? 700 : 500} fill={m.atual ? "#f3d47a" : "#7f796d"}>{m.rotulo}</text>
          </g>
        );
      })}
    </svg>
  );
}
