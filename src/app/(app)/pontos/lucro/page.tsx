import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { hoje, money } from "@/lib/format";
import { TIPO_SINGULAR } from "@/lib/labels";
import { lucroPorPonto, ultimosMeses } from "@/lib/lucro";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lucro por ponto" };

const PERIODOS = { "3": "3 meses", "6": "6 meses", "12": "12 meses" } as const;

export default async function LucroPontos({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const [, sp] = await Promise.all([requireUser("lucro"), searchParams]);
  const periodo = sp.p && sp.p in PERIODOS ? sp.p : "12";
  const h = hoje();
  const { inicio, fim } = ultimosMeses(Number(periodo), h);
  const [{ pontos, geral }, todos] = await Promise.all([lucroPorPonto(inicio, fim), prisma.ponto.findMany({ select: { id: true, nome: true, tipo: true, ativo: true } })]);
  const nomes = new Map(todos.map((p) => [p.id, p]));
  const linhas = pontos.sort((a, b) => b.lucro - a.lucro);
  const totalReceita = linhas.reduce((s, l) => s + l.receita, 0);
  const totalDespesas = linhas.reduce((s, l) => s + l.despesas, 0) + geral;

  return (
    <main>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1>Lucro por ponto</h1>
        <div className="flex gap-2">
          {(Object.keys(PERIODOS) as (keyof typeof PERIODOS)[]).map((k) => (
            <Link key={k} href={`/pontos/lucro?p=${k}`} className={`btn btn-sm ${k === periodo ? "btn-gold" : ""}`}>{PERIODOS[k]}</Link>
          ))}
        </div>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Ponto</th><th>Tipo</th><th>Receita</th><th>Despesas</th><th>Lucro</th><th>Margem</th></tr></thead>
          <tbody>
            {linhas.length === 0 && <tr><td colSpan={6} className="text-ink-soft">Sem recebimentos nem despesas no período.</td></tr>}
            {linhas.map((l) => {
              const p = nomes.get(l.pontoId);
              return (
                <tr key={l.pontoId}>
                  <td><Link className="font-medium hover:text-gold-soft" href={`/pontos/${l.pontoId}`}>{p?.nome ?? "—"}</Link></td>
                  <td>{p ? TIPO_SINGULAR[p.tipo] : "—"}</td>
                  <td>{money(l.receita)}</td>
                  <td>{money(l.despesas)}</td>
                  <td className={`font-semibold ${l.lucro >= 0 ? "text-good" : "text-danger"}`}>{money(l.lucro)}</td>
                  <td>{l.margem == null ? "—" : `${l.margem.toString().replace(".", ",")}%`}</td>
                </tr>
              );
            })}
            {geral > 0 && (
              <tr className="text-ink-soft"><td colSpan={3}>Despesas gerais (não ligadas a um ponto)</td><td>{money(geral)}</td><td colSpan={2}></td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="font-semibold text-gold">Total</td>
              <td className="font-semibold">{money(totalReceita)}</td>
              <td className="font-semibold">{money(totalDespesas)}</td>
              <td colSpan={2} className={`font-semibold ${totalReceita - totalDespesas >= 0 ? "text-good" : "text-danger"}`}>{money(totalReceita - totalDespesas)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Receita = o que foi recebido no período, repartido entre os pontos de cada contrato na proporção do valor de cada um. Despesas = as pagas e ligadas ao ponto. Para um resultado fiel, ligue as despesas de energia, aluguel e manutenção ao ponto certo.
      </p>
    </main>
  );
}
