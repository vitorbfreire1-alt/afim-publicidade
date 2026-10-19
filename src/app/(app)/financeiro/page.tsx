import Link from "next/link";
import Flash from "@/components/Flash";
import ReceberParcela from "@/components/ReceberParcela";
import StatusBadge from "@/components/StatusBadge";
import { podeReceber, requireUser } from "@/lib/auth";
import { filtroEmAtraso, statusParcela } from "@/lib/financeiro";
import { dateBR, hoje, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Financeiro" };

const FILTROS = {
  atraso: "Em atraso",
  vencer: "A vencer",
  pagas: "Recebidas",
} as const;
type Filtro = keyof typeof FILTROS;

export default async function Financeiro({ searchParams }: { searchParams: Promise<{ f?: string; erro?: string; ok?: string }> }) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const f: Filtro = sp.f && sp.f in FILTROS ? (sp.f as Filtro) : "atraso";
  const h = hoje();
  const ativo = { contrato: { status: "ATIVO" as const } };

  const where =
    f === "atraso" ? filtroEmAtraso()
    : f === "vencer" ? { ...ativo, pagoEm: null, vencimento: { gte: h } }
    : { pagoEm: { not: null } };

  const parcelas = await prisma.parcela.findMany({
    where,
    orderBy: { [f === "pagas" ? "pagoEm" : "vencimento"]: f === "pagas" ? "desc" : "asc" },
    take: 200,
    include: { contrato: { include: { cliente: true } } },
  });
  const total = parcelas.reduce((s, p) => s + Number(f === "pagas" ? p.valorPago : p.valor), 0);
  const volta = `/financeiro?f=${f}`;

  return (
    <main>
      <Flash erro={sp.erro} ok={sp.ok} />
      <h1 className="mb-4 text-xl font-bold">Financeiro</h1>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(Object.keys(FILTROS) as Filtro[]).map((k) => (
          <Link key={k} href={`/financeiro?f=${k}`} className={`btn btn-sm whitespace-nowrap ${k === f ? "btn-gold" : ""}`}>
            {FILTROS[k]}
          </Link>
        ))}
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Cliente</th><th>Contrato</th><th>Parcela</th><th>{f === "pagas" ? "Recebida em" : "Vencimento"}</th><th>Valor</th><th>Situação</th><th>Recebimento</th></tr>
          </thead>
          <tbody>
            {parcelas.length === 0 && <tr><td colSpan={7} className="text-ink-soft">Nada por aqui.</td></tr>}
            {parcelas.map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.contrato.cliente.nome}</td>
                <td><Link className="text-gold" href={`/contratos/${p.contratoId}`}>#{p.contrato.numero}</Link></td>
                <td>{p.numero}/{p.contrato.prazoMeses}</td>
                <td>{dateBR(f === "pagas" ? p.pagoEm : p.vencimento)}</td>
                <td>{money(f === "pagas" ? p.valorPago : p.valor)}</td>
                <td><StatusBadge status={statusParcela(p, h)} /></td>
                <td>
                  <ReceberParcela
                    id={p.id}
                    valor={Number(p.valor)}
                    forma={p.contrato.formaPagamento}
                    volta={volta}
                    pagoEm={p.pagoEm}
                    formaRecebida={p.formaRecebida}
                    pode={podeReceber(user.papel)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          {parcelas.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} className="font-semibold text-gold">Total ({parcelas.length})</td>
                <td colSpan={3} className="font-semibold">{money(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {parcelas.length === 200 && <p className="mt-2 text-xs text-ink-faint">Mostrando as 200 primeiras.</p>}
    </main>
  );
}
