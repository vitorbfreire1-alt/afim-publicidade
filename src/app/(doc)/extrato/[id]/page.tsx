import { notFound } from "next/navigation";
import BotaoImprimir from "@/components/BotaoImprimir";
import { requireUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { calcularEncargos, regrasDe } from "@/lib/encargos";
import { statusParcela } from "@/lib/financeiro";
import { dateBR, hoje, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Extrato do cliente", robots: { index: false } };

const SIT = { PAGA: "Recebida", ATRASADA: "Em atraso", A_VENCER: "A vencer" } as const;

export default async function Extrato({ params }: { params: Promise<{ id: string }> }) {
  const [, { id }] = await Promise.all([requireUser(), params]);
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { contratos: { orderBy: { numero: "asc" }, include: { parcelas: { orderBy: { numero: "asc" } }, pontos: { include: { ponto: true } } } } },
  });
  if (!cliente) notFound();
  const empresa = await getConfig();
  const regras = regrasDe(empresa);
  const h = hoje();

  const todas = cliente.contratos.flatMap((c) => c.parcelas.map((p) => ({ c, p })));
  const pago = todas.filter(({ p }) => p.pagoEm).reduce((s, { p }) => s + Number(p.valorPago ?? 0), 0);
  const aberto = todas.filter(({ p, c }) => !p.pagoEm && c.status === "ATIVO").reduce((s, { p }) => s + Number(p.valor), 0);
  const atraso = todas
    .filter(({ p, c }) => !p.pagoEm && c.status === "ATIVO" && p.vencimento < h)
    .reduce((s, { p }) => s + calcularEncargos(Number(p.valor), p.vencimento, regras, h).total, 0);

  return (
    <div className="doc">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#151515] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9a7416]">{empresa.nomeFantasia || "AFIM Publicidade"}</p>
            <h1 className="mt-1 text-2xl font-bold">Extrato do cliente</h1>
            <p className="text-sm">{cliente.nome}{cliente.documento && ` · ${cliente.documento}`}</p>
            <p className="text-xs text-[#555]">Emitido em {dateBR(h)}</p>
          </div>
          <BotaoImprimir />
        </header>

        <section className="mb-6 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-[#ccc] p-3"><p className="text-xs uppercase text-[#666]">Total recebido</p><p className="text-lg font-bold">{money(pago)}</p></div>
          <div className="rounded-lg border border-[#ccc] p-3"><p className="text-xs uppercase text-[#666]">Em aberto</p><p className="text-lg font-bold">{money(aberto)}</p></div>
          <div className="rounded-lg border border-[#ccc] p-3"><p className="text-xs uppercase text-[#666]">Vencido (com encargos)</p><p className="text-lg font-bold text-[#b42318]">{money(atraso)}</p></div>
        </section>

        {cliente.contratos.map((c) => (
          <section key={c.id} className="mb-6 break-inside-avoid">
            <h2 className="mb-1 text-sm font-bold">Contrato #{c.numero} · {c.pontos.map((x) => x.ponto.nome).join(", ")}</h2>
            <table>
              <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Pago em</th><th>Valor pago</th></tr></thead>
              <tbody>
                {c.parcelas.map((p) => (
                  <tr key={p.id}>
                    <td>{p.numero}/{c.parcelas.length}</td>
                    <td>{dateBR(p.vencimento)}</td>
                    <td>{money(p.valor)}</td>
                    <td>{SIT[statusParcela(p, h)]}</td>
                    <td>{dateBR(p.pagoEm)}</td>
                    <td>{p.valorPago ? money(p.valorPago) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        {cliente.contratos.length === 0 && <p className="text-sm text-[#555]">Este cliente ainda não tem contratos.</p>}
      </div>
    </div>
  );
}
