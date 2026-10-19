import Link from "next/link";
import Flash from "@/components/Flash";
import { alertas, resumoFinanceiro } from "@/lib/financeiro";
import { dateBR, diasEntre, hoje, money } from "@/lib/format";

export const dynamic = "force-dynamic";

function Kpi({ label, value, sub, tom }: { label: string; value: string; sub?: string; tom?: "danger" | "good" }) {
  return (
    <div className="card p-4">
      <p className="label">{label}</p>
      <p className={`text-2xl font-bold ${tom === "danger" ? "text-danger" : tom === "good" ? "text-good" : "text-gold"}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

export default async function Painel({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  const [r, a] = await Promise.all([resumoFinanceiro(), alertas()]);
  const h = hoje();
  const ocupacao = r.pontosTotal ? Math.round((r.pontosOcupados / r.pontosTotal) * 100) : 0;

  return (
    <main>
      <Flash erro={erro} ok={ok} />
      <h1 className="mb-4 text-xl font-bold">Painel</h1>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Inadimplência" value={money(r.inadimplencia)} sub={`${r.parcelasEmAtraso} parcela(s) em atraso`} tom={r.inadimplencia > 0 ? "danger" : "good"} />
        <Kpi label="Recebido no mês" value={money(r.recebidoMes)} sub={`Previsto: ${money(r.previstoMes)}`} />
        <Kpi label="Contratos ativos" value={String(r.contratosAtivos)} />
        <Kpi label="Pontos com clientes" value={`${ocupacao}%`} sub={`${r.pontosOcupados} de ${r.pontosTotal} pontos com contrato ativo`} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-semibold text-danger">Em atraso</h2>
          {a.atrasadas.length === 0 ? (
            <p className="text-sm text-ink-soft">Nenhuma parcela em atraso.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {a.atrasadas.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/contratos/${p.contratoId}`} className="min-w-0 hover:text-gold">
                    <span className="block truncate font-medium">{p.contrato.cliente.nome}</span>
                    <span className="text-xs text-ink-soft">
                      Parcela {p.numero} · venceu {dateBR(p.vencimento)} ({diasEntre(p.vencimento, h)} dias)
                    </span>
                  </Link>
                  <span className="shrink-0 font-semibold">{money(p.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-semibold text-warn">Vencem nos próximos 7 dias</h2>
          {a.aVencer.length === 0 ? (
            <p className="text-sm text-ink-soft">Nada vencendo esta semana.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {a.aVencer.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/contratos/${p.contratoId}`} className="min-w-0 hover:text-gold">
                    <span className="block truncate font-medium">{p.contrato.cliente.nome}</span>
                    <span className="text-xs text-ink-soft">
                      Parcela {p.numero} · vence {dateBR(p.vencimento)}
                    </span>
                  </Link>
                  <span className="shrink-0 font-semibold">{money(p.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold text-gold">Contratos terminando em até 60 dias</h2>
          {a.terminando.length === 0 ? (
            <p className="text-sm text-ink-soft">Nenhum contrato perto do fim.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {a.terminando.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/contratos/${c.id}`} className="min-w-0 hover:text-gold">
                    <span className="block truncate font-medium">{c.cliente.nome}</span>
                    <span className="text-xs text-ink-soft">{c.pontos.map((p) => p.ponto.nome).join(", ")}</span>
                  </Link>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold">{dateBR(c.fim)}</span>
                    <span className="text-xs text-ink-soft">em {diasEntre(h, c.fim)} dias</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
