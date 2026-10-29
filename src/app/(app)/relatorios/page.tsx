import { Download } from "lucide-react";
import BotaoImprimir from "@/components/BotaoImprimir";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { dateBR, hoje, isoDate, money } from "@/lib/format";
import { CATEGORIA_LABEL, TIPO_LABEL } from "@/lib/labels";
import { contratosFinalizados, periodoDe, relatorioFinanceiro } from "@/lib/relatorios";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatórios" };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (k: string) => `${MESES[Number(k.slice(5)) - 1]}/${k.slice(2, 4)}`;

function Barra({ valor, max, cor = "bg-gold" }: { valor: number; max: number; cor?: string }) {
  return <span className="block h-1.5 overflow-hidden rounded-full bg-white/10"><span className={`block h-full rounded-full ${cor}`} style={{ width: `${max ? Math.max(2, (valor / max) * 100) : 0}%` }} /></span>;
}

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  const [, sp] = await Promise.all([requireUser("relatorios"), searchParams]);
  const periodo = periodoDe(sp.de, sp.ate);
  const [r, finalizados] = await Promise.all([relatorioFinanceiro(periodo), contratosFinalizados(periodo)]);
  const somaFin = finalizados.reduce((t, c) => ({ total: t.total + c.total, recebido: t.recebido + c.recebido, emAberto: t.emAberto + c.emAberto }), { total: 0, recebido: 0, emAberto: 0 });
  const qs = `de=${isoDate(periodo.inicio)}&ate=${isoDate(periodo.fim)}`;
  const maxMes = Math.max(1, ...r.porMes.map(([, v]) => v));
  const maxCliente = Math.max(1, ...r.porCliente.slice(0, 10).map((c) => c.total));
  const maxCat = Math.max(1, ...r.porCategoria.map(([, v]) => v));
  const totalInad = r.inadimplencia.reduce((s, l) => s + l.atualizado, 0);

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Relatórios</h1>
        <BotaoImprimirApp />
      </div>

      <form className="card no-print flex flex-wrap items-end gap-3 p-4">
        <div><label className="label" htmlFor="de">De</label><input className="input" id="de" name="de" type="date" defaultValue={isoDate(periodo.inicio)} /></div>
        <div><label className="label" htmlFor="ate">Até</label><input className="input" id="ate" name="ate" type="date" defaultValue={isoDate(periodo.fim)} max={isoDate(hoje())} /></div>
        <button className="btn btn-gold" type="submit">Atualizar</button>
        <div className="ml-auto flex flex-wrap gap-2">
          {(["parcelas", "despesas", "contratos", "finalizados", "clientes"] as const).map((t) => (
            <a key={t} className="btn btn-sm" href={`/api/exportar/${t}?${qs}`}><Download className="size-3.5" /> {t[0].toUpperCase() + t.slice(1)} (Excel)</a>
          ))}
        </div>
      </form>

      <section className="grid grid-cols-3 gap-3">
        <div className="card p-4"><p className="label">Recebido</p><p className="font-display text-lg font-bold text-grad">{money(r.totalRecebido)}</p></div>
        <div className="card p-4"><p className="label">Despesas pagas</p><p className="font-display text-lg font-bold text-danger">{money(r.totalDespesas)}</p></div>
        <div className="card p-4"><p className="label">Resultado</p><p className={`font-display text-lg font-bold ${r.totalRecebido - r.totalDespesas >= 0 ? "text-good" : "text-danger"}`}>{money(r.totalRecebido - r.totalDespesas)}</p></div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gold-soft">Faturamento por mês</h2>
          {r.porMes.length === 0 ? <p className="text-sm text-ink-soft">Sem recebimentos no período.</p> : (
            <ul className="space-y-2 text-sm">
              {r.porMes.map(([k, v]) => (<li key={k}><div className="flex justify-between"><span>{rotuloMes(k)}</span><span className="tabular-nums">{money(v)}</span></div><Barra valor={v} max={maxMes} /></li>))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gold-soft">Faturamento por tipo de mídia</h2>
          {r.porTipo.length === 0 ? <p className="text-sm text-ink-soft">Sem dados.</p> : (
            <ul className="space-y-2 text-sm">
              {r.porTipo.map(([t, v]) => (<li key={t}><div className="flex justify-between"><span>{TIPO_LABEL[t as keyof typeof TIPO_LABEL] ?? t}</span><span className="tabular-nums">{money(v)}</span></div><Barra valor={v} max={r.porTipo[0][1]} /></li>))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gold-soft">Maiores clientes (recebido)</h2>
          {r.porCliente.length === 0 ? <p className="text-sm text-ink-soft">Sem dados.</p> : (
            <ul className="space-y-2 text-sm">
              {r.porCliente.slice(0, 10).map((c) => (<li key={c.nome}><div className="flex justify-between gap-3"><span className="truncate">{c.nome}</span><span className="tabular-nums">{money(c.total)}</span></div><Barra valor={c.total} max={maxCliente} /></li>))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gold-soft">Despesas por categoria</h2>
          {r.porCategoria.length === 0 ? <p className="text-sm text-ink-soft">Sem despesas pagas no período.</p> : (
            <ul className="space-y-2 text-sm">
              {r.porCategoria.map(([k, v]) => (<li key={k}><div className="flex justify-between"><span>{CATEGORIA_LABEL[k as keyof typeof CATEGORIA_LABEL] ?? k}</span><span className="tabular-nums">{money(v)}</span></div><Barra valor={v} max={maxCat} cor="bg-danger" /></li>))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-danger">
          Inadimplência por cliente (hoje) <span className="text-xs font-normal text-ink-soft">Total com encargos: {money(totalInad)}</span>
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Cliente</th>{r.faixas.map((f) => <th key={f}>{f}</th>)}<th>Nominal</th><th>Atualizado</th></tr></thead>
            <tbody>
              {r.inadimplencia.length === 0 && <tr><td colSpan={7} className="text-ink-soft">Nenhum cliente inadimplente.</td></tr>}
              {r.inadimplencia.map((l) => (
                <tr key={l.nome}>
                  <td className="font-medium">{l.nome}</td>
                  {l.faixas.map((v, i) => <td key={i} className="tabular-nums">{v ? money(v) : "—"}</td>)}
                  <td className="tabular-nums">{money(l.nominal)}</td>
                  <td className="font-semibold tabular-nums text-danger">{money(l.atualizado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-gold-soft">
          Contratos finalizados no período <span className="text-xs font-normal text-ink-soft">{finalizados.length} contrato(s) · terminaram entre {dateBR(periodo.inicio)} e {dateBR(periodo.fim)}</span>
        </h2>
        <p className="mb-3 text-xs text-ink-faint">Mostra os contratos cujo fim já passou. Os valores consideram as parcelas que estão no sistema (as da gestão anterior, retiradas, não entram).</p>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nº</th><th>Cliente</th><th>Pontos</th><th>Período</th><th>Contratado</th><th>Recebido</th><th>Em aberto</th><th>Situação</th></tr></thead>
            <tbody>
              {finalizados.length === 0 && <tr><td colSpan={8} className="text-ink-soft">Nenhum contrato terminou neste período.</td></tr>}
              {finalizados.map((c) => (
                <tr key={c.id}>
                  <td><Link className="font-medium text-gold" href={`/contratos/${c.id}`}>{c.numero}</Link></td>
                  <td className="font-medium">{c.cliente}</td>
                  <td className="text-xs">{c.pontos.join(", ")}</td>
                  <td className="whitespace-nowrap">{dateBR(c.inicio)}<span className="block text-xs text-ink-faint">até {dateBR(c.fim)}</span></td>
                  <td className="tabular-nums">{money(c.total)}</td>
                  <td className="tabular-nums text-good">{money(c.recebido)}</td>
                  <td className={`tabular-nums ${c.emAberto > 0 ? "font-semibold text-danger" : ""}`}>{money(c.emAberto)}</td>
                  <td>{c.emAberto > 0 ? <span className="badge text-danger">Com saldo</span> : <span className="badge text-good">Quitado</span>}{c.status === "ENCERRADO" && <span className="ml-1 text-xs text-ink-faint">encerrado</span>}</td>
                </tr>
              ))}
            </tbody>
            {finalizados.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} className="font-semibold text-gold">Total</td>
                  <td className="font-semibold tabular-nums">{money(somaFin.total)}</td>
                  <td className="font-semibold tabular-nums text-good">{money(somaFin.recebido)}</td>
                  <td className="font-semibold tabular-nums text-danger">{money(somaFin.emAberto)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </main>
  );
}

function BotaoImprimirApp() {
  return <div className="no-print"><BotaoImprimir /></div>;
}
