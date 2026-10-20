import Link from "next/link";
import { Plus } from "lucide-react";
import Flash from "@/components/Flash";
import PagarDespesa from "@/components/PagarDespesa";
import StatusBadge from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { filtroDespesaEmAtraso, statusParcela } from "@/lib/financeiro";
import { dateBR, hoje, money } from "@/lib/format";
import { CATEGORIA_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Despesas" };

const FILTROS = { atraso: "Em atraso", pagar: "A pagar", pagas: "Pagas" } as const;
type Filtro = keyof typeof FILTROS;

export default async function Despesas({ searchParams }: { searchParams: Promise<{ f?: string; erro?: string; ok?: string }> }) {
  const [, sp] = await Promise.all([requireUser("FINANCEIRO"), searchParams]);
  const f: Filtro = sp.f && sp.f in FILTROS ? (sp.f as Filtro) : "pagar";
  const h = hoje();

  const where = f === "atraso" ? filtroDespesaEmAtraso() : f === "pagar" ? { pagoEm: null, vencimento: { gte: h } } : { pagoEm: { not: null } };
  const despesas = await prisma.despesa.findMany({
    where,
    orderBy: f === "pagas" ? { pagoEm: "desc" } : { vencimento: "asc" },
    take: 200,
    include: { ponto: true },
  });
  const total = despesas.reduce((s, d) => s + Number(f === "pagas" ? d.valorPago : d.valor), 0);
  const volta = `/despesas?f=${f}`;

  return (
    <main>
      <Flash erro={sp.erro} ok={sp.ok} />
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1>Despesas</h1>
        <Link className="btn btn-gold" href="/despesas/nova"><Plus className="size-4" /> Nova despesa</Link>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(Object.keys(FILTROS) as Filtro[]).map((k) => (
          <Link key={k} href={`/despesas?f=${k}`} className={`btn btn-sm whitespace-nowrap ${k === f ? "btn-gold" : ""}`}>{FILTROS[k]}</Link>
        ))}
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Despesa</th><th>Categoria</th><th>Ponto</th><th>{f === "pagas" ? "Paga em" : "Vencimento"}</th><th>Valor</th><th>Situação</th><th></th></tr>
          </thead>
          <tbody>
            {despesas.length === 0 && <tr><td colSpan={7} className="text-ink-soft">Nada por aqui.</td></tr>}
            {despesas.map((d) => (
              <tr key={d.id}>
                <td>
                  <span className="font-medium">{d.descricao}</span>
                  {d.fornecedor && <span className="block text-xs text-ink-faint">{d.fornecedor}</span>}
                </td>
                <td>{CATEGORIA_LABEL[d.categoria]}</td>
                <td>{d.ponto?.nome ?? "—"}</td>
                <td className="whitespace-nowrap">{dateBR(f === "pagas" ? d.pagoEm : d.vencimento)}</td>
                <td className="whitespace-nowrap">{money(f === "pagas" ? d.valorPago : d.valor)}</td>
                <td><StatusBadge status={statusParcela(d, h)} rotulos={{ PAGA: "Paga", ATRASADA: "Em atraso", A_VENCER: "A vencer" }} /></td>
                <td><PagarDespesa id={d.id} valor={Number(d.valor)} volta={volta} pagoEm={d.pagoEm} emSerie={Boolean(d.grupo)} /></td>
              </tr>
            ))}
          </tbody>
          {despesas.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} className="font-semibold text-gold">Total ({despesas.length})</td>
                <td colSpan={3} className="font-semibold">{money(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {despesas.length === 200 && <p className="mt-2 text-xs text-ink-faint">Mostrando as 200 primeiras.</p>}
    </main>
  );
}
