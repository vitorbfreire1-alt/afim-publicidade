import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FluxoCaixaChart, { valorDoMes } from "@/components/FluxoCaixaChart";
import { requireUser } from "@/lib/auth";
import { fluxoCaixa } from "@/lib/financeiro";
import { hoje, money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fluxo de caixa" };

const MESES = 12;

/** Janela de 12 meses: padrão começa 2 meses atrás; `de=AAAA-MM` desloca. */
function inicioDaJanela(de?: string): Date {
  const h = hoje();
  const m = /^(\d{4})-(\d{2})$/.exec(de ?? "");
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 2, 1));
}
const chave = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const deslocar = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

export default async function Fluxo({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  const [, { de }] = await Promise.all([requireUser("fluxo"), searchParams]);
  const inicio = inicioDaJanela(de);
  const meses = await fluxoCaixa(inicio, MESES);
  const iAtual = meses.findIndex((m) => m.atual);

  const porMes = meses.map((m, i) => {
    const futuro = iAtual >= 0 ? i > iAtual : inicio > hoje();
    const { entrada, saida } = valorDoMes(m, futuro);
    return { m, futuro, entrada, saida, resultado: entrada - saida };
  });
  const linhas = porMes.map((l, i) => ({ ...l, acumulado: porMes.slice(0, i + 1).reduce((s, x) => s + x.resultado, 0) }));
  const soma = (f: (l: (typeof linhas)[number]) => number) => linhas.reduce((s, l) => s + f(l), 0);
  const atual = iAtual >= 0 ? linhas[iAtual] : null;

  return (
    <main>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1>Fluxo de caixa</h1>
        <div className="flex gap-2">
          <Link className="btn btn-sm" href={`/fluxo?de=${chave(deslocar(inicio, -6))}`} aria-label="Meses anteriores"><ChevronLeft className="size-4" /> Anterior</Link>
          <Link className="btn btn-sm" href="/fluxo">Hoje</Link>
          <Link className="btn btn-sm" href={`/fluxo?de=${chave(deslocar(inicio, 6))}`} aria-label="Próximos meses">Próximo <ChevronRight className="size-4" /></Link>
        </div>
      </div>

      {atual && (
        <section className="mb-4 grid grid-cols-3 gap-3">
          <div className="card p-4"><p className="label">Entradas no mês</p><p className="font-display text-lg font-bold text-grad">{money(atual.entrada)}</p></div>
          <div className="card p-4"><p className="label">Saídas no mês</p><p className="font-display text-lg font-bold text-danger">{money(atual.saida)}</p></div>
          <div className="card p-4"><p className="label">Resultado</p><p className={`font-display text-lg font-bold ${atual.resultado >= 0 ? "text-good" : "text-danger"}`}>{money(atual.resultado)}</p></div>
        </section>
      )}

      <section className="card p-5">
        <FluxoCaixaChart meses={meses} />
      </section>

      <div className="card table-wrap mt-4">
        <table className="table">
          <thead>
            <tr><th>Mês</th><th>Entradas prev.</th><th>Recebidas</th><th>Saídas prev.</th><th>Pagas</th><th>Resultado</th><th>Acumulado</th></tr>
          </thead>
          <tbody>
            {linhas.map(({ m, futuro, resultado, acumulado: ac }) => (
              <tr key={m.chave} className={m.atual ? "bg-gold/5" : ""}>
                <td className="whitespace-nowrap font-medium">{m.rotulo}{m.atual && <span className="badge ml-2 text-gold">Atual</span>}</td>
                <td>{money(m.entradaPrevista)}</td>
                <td>{futuro ? "—" : money(m.entradaRealizada)}</td>
                <td>{money(m.saidaPrevista)}</td>
                <td>{futuro ? "—" : money(m.saidaRealizada)}</td>
                <td className={resultado >= 0 ? "text-good" : "text-danger"}>{money(resultado)}{futuro && <span className="ml-1 text-xs text-ink-faint">prev.</span>}</td>
                <td className={ac >= 0 ? "" : "text-danger"}>{money(ac)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="font-semibold text-gold">Total do período</td>
              <td className="font-semibold">{money(soma((l) => l.m.entradaPrevista))}</td>
              <td className="font-semibold">{money(soma((l) => (l.futuro ? 0 : l.m.entradaRealizada)))}</td>
              <td className="font-semibold">{money(soma((l) => l.m.saidaPrevista))}</td>
              <td className="font-semibold">{money(soma((l) => (l.futuro ? 0 : l.m.saidaRealizada)))}</td>
              <td colSpan={2} className={`font-semibold ${soma((l) => l.resultado) >= 0 ? "text-good" : "text-danger"}`}>{money(soma((l) => l.resultado))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Previsto = pelo vencimento. Recebido/pago = pela data em que o dinheiro entrou ou saiu. O resultado usa o realizado até o mês atual e o previsto nos meses seguintes.
      </p>
    </main>
  );
}
