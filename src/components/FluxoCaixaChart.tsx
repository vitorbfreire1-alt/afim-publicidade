import type { MesCaixa } from "@/lib/financeiro";
import { money } from "@/lib/format";

const curto = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v > 0 ? String(Math.round(v)) : "");

/** Valor do mês: realizado até o mês atual, previsto nos meses futuros (barras tracejadas). */
export const valorDoMes = (m: MesCaixa, futuro: boolean) => ({
  entrada: futuro ? m.entradaPrevista : m.entradaRealizada,
  saida: futuro ? m.saidaPrevista : m.saidaRealizada,
});

export default function FluxoCaixaChart({ meses }: { meses: MesCaixa[] }) {
  const iAtual = meses.findIndex((m) => m.atual);
  const dados = meses.map((m, i) => ({ m, futuro: iAtual >= 0 ? i > iAtual : false, ...valorDoMes(m, iAtual >= 0 ? i > iAtual : false) }));
  const maior = Math.max(1, ...dados.flatMap((d) => [d.entrada, d.saida]));
  const W = 720, H = 230, base = 196, topo = 26, larg = W / meses.length;
  const alt = (v: number) => ((base - topo) * v) / maior;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Entradas e saídas por mês" className="mx-auto max-h-72 w-full">
        <defs>
          <linearGradient id="ent" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f3d47a" /><stop offset="100%" stopColor="#9a7416" /></linearGradient>
          <linearGradient id="sai" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f47c6e" /><stop offset="100%" stopColor="#8f2c22" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={base - (base - topo) * f} y2={base - (base - topo) * f} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" />
        ))}
        {dados.map(({ m, futuro, entrada, saida }, i) => {
          const x = i * larg + larg / 2;
          const bw = Math.min(20, larg / 3.2);
          const estilo = futuro ? { fillOpacity: 0.35, strokeDasharray: "3 3" } : {};
          return (
            <g key={m.chave}>
              <title>{`${m.rotulo}${futuro ? " (previsto)" : ""}: entradas ${money(entrada)} · saídas ${money(saida)} · resultado ${money(entrada - saida)}`}</title>
              <rect x={x - bw - 1.5} y={base - alt(entrada)} width={bw} height={Math.max(alt(entrada), 0)} rx="3" fill="url(#ent)" stroke="#f3d47a" strokeWidth={futuro ? 1 : 0} {...estilo} />
              <rect x={x + 1.5} y={base - alt(saida)} width={bw} height={Math.max(alt(saida), 0)} rx="3" fill="url(#sai)" stroke="#f47c6e" strokeWidth={futuro ? 1 : 0} {...estilo} />
              <text x={x - bw / 2 - 1.5} y={base - alt(entrada) - 5} textAnchor="middle" fontSize="11" fill="#f3d47a">{curto(entrada)}</text>
              <text x={x + bw / 2 + 1.5} y={base - alt(saida) - 5} textAnchor="middle" fontSize="11" fill="#f47c6e">{curto(saida)}</text>
              <text x={x} y={H - 8} textAnchor="middle" fontSize="12" fontWeight={m.atual ? 700 : 500} fill={m.atual ? "#f3d47a" : "#7f796d"}>{m.rotulo}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-gold" /> Entradas</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-danger" /> Saídas</span>
        <span className="text-ink-faint">Barras tracejadas = previsto (meses futuros)</span>
      </figcaption>
    </figure>
  );
}
