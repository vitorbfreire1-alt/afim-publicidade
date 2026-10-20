import Link from "next/link";
import AbrirLink from "@/components/AbrirLink";
import BotaoWhatsapp from "@/components/BotaoWhatsapp";
import Flash from "@/components/Flash";
import ReceberParcela from "@/components/ReceberParcela";
import StatusBadge from "@/components/StatusBadge";
import { pode, requireUser } from "@/lib/auth";
import { filtroEmAtraso, statusParcela } from "@/lib/financeiro";
import { dateBR, hoje, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { linkCobranca } from "@/lib/whatsapp";
import { calcularEncargos, regrasDe } from "@/lib/encargos";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Financeiro" };

const FILTROS = {
  atraso: "Em atraso",
  vencer: "A vencer",
  pagas: "Recebidas",
} as const;
type Filtro = keyof typeof FILTROS;

export default async function Financeiro({ searchParams }: { searchParams: Promise<{ f?: string; erro?: string; ok?: string }> }) {
  const [user, sp] = await Promise.all([requireUser("receber"), searchParams]);
  const f: Filtro = sp.f && sp.f in FILTROS ? (sp.f as Filtro) : "atraso";
  const h = hoje();
  const ativo = { contrato: { status: "ATIVO" as const } };

  const where =
    f === "atraso" ? filtroEmAtraso()
    : f === "vencer" ? { ...ativo, pagoEm: null, renegociadaEm: null, vencimento: { gte: h } }
    : { pagoEm: { not: null } };

  const parcelas = await prisma.parcela.findMany({
    where,
    orderBy: { [f === "pagas" ? "pagoEm" : "vencimento"]: f === "pagas" ? "desc" : "asc" },
    take: 200,
    include: { contrato: { include: { cliente: true, _count: { select: { parcelas: true } } } } },
  });
  const regras = regrasDe(await getConfig());
  const encargos = (p: (typeof parcelas)[number]) => (p.pagoEm || p.renegociadaEm ? null : calcularEncargos(Number(p.valor), p.vencimento, regras, h));
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
            <tr><th>Cliente</th><th>Contrato</th><th>Parcela</th><th>{f === "pagas" ? "Recebida em" : "Vencimento"}</th><th>Valor</th><th>Situação</th><th>Recebimento</th><th>Cobrança</th><th className="col-acao"><span className="sr-only">Ação</span></th></tr>
          </thead>
          <tbody>
            {parcelas.length === 0 && <tr><td colSpan={9} className="text-ink-soft">Nada por aqui.</td></tr>}
            {parcelas.map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.contrato.cliente.nome}</td>
                <td><Link className="text-gold" href={`/contratos/${p.contratoId}`}>#{p.contrato.numero}</Link></td>
                <td>{p.numero}/{p.contrato._count.parcelas}</td>
                <td>{dateBR(f === "pagas" ? p.pagoEm : p.vencimento)}</td>
                <td className="whitespace-nowrap">
                  {money(f === "pagas" ? p.valorPago : p.valor)}
                  {(() => { const e = encargos(p); return e && e.total > Number(p.valor) ? <span className="block text-xs text-danger" title={`Multa ${money(e.multa)} + juros ${money(e.juros)}`}>atualizado {money(e.total)}</span> : null; })()}
                </td>
                <td><StatusBadge status={statusParcela(p, h)} /></td>
                <td>
                  <ReceberParcela
                    id={p.id}
                    valor={encargos(p)?.total ?? Number(p.valor)}
                    forma={p.contrato.formaPagamento}
                    volta={volta}
                    pagoEm={p.pagoEm}
                    formaRecebida={p.formaRecebida}
                    pode={pode(user, "baixar")}
                  />
                </td>
                <td>
                  {!p.pagoEm && !p.renegociadaEm && (
                    <BotaoWhatsapp
                      href={linkCobranca({ cliente: p.contrato.cliente, numero: p.numero, total: p.contrato._count.parcelas, vencimento: p.vencimento, valor: p.valor, atualizado: encargos(p)?.total })}
                    />
                  )}
                </td>
                <td className="col-acao"><AbrirLink href={`/contratos/${p.contratoId}`} rotulo={`Abrir contrato ${p.contrato.numero} de ${p.contrato.cliente.nome}`} /></td>
              </tr>
            ))}
          </tbody>
          {parcelas.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} className="font-semibold text-gold">Total ({parcelas.length})</td>
                <td colSpan={5} className="font-semibold">{money(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {parcelas.length === 200 && <p className="mt-2 text-xs text-ink-faint">Mostrando as 200 primeiras.</p>}
    </main>
  );
}
