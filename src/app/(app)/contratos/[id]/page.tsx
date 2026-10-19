import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/Flash";
import ReceberParcela from "@/components/ReceberParcela";
import StatusBadge from "@/components/StatusBadge";
import { mudarStatusContrato } from "@/app/actions/contratos";
import { podeEditarCadastros, podeReceber, requireUser } from "@/lib/auth";
import { statusParcela, valorMensalAtual } from "@/lib/financeiro";
import { dateBR, money } from "@/lib/format";
import { FORMA_LABEL, STATUS_CONTRATO_LABEL, TIPO_SINGULAR } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ContratoPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const [user, { id }, { erro, ok }] = await Promise.all([requireUser(), params, searchParams]);
  const c = await prisma.contrato.findUnique({
    where: { id },
    include: {
      cliente: true,
      pontos: { include: { ponto: true } },
      parcelas: { orderBy: { numero: "asc" } },
    },
  });
  if (!c) notFound();

  const volta = `/contratos/${id}`;
  const recebido = c.parcelas.reduce((s, p) => s + Number(p.valorPago ?? 0), 0);
  const emAberto = c.parcelas.filter((p) => !p.pagoEm).reduce((s, p) => s + Number(p.valor), 0);
  const edita = podeEditarCadastros(user.papel);

  return (
    <main>
      <Flash erro={erro} ok={ok} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Contrato #{c.numero}</h1>
          <Link className="text-gold hover:underline" href={`/clientes/${c.clienteId}`}>{c.cliente.nome}</Link>
        </div>
        <span className="badge text-gold">{STATUS_CONTRATO_LABEL[c.status]}</span>
      </div>

      <section className="card mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="label">Valor mensal hoje</p><p className="font-semibold">{money(valorMensalAtual(c.pontos))}</p></div>
        <div><p className="label">Forma de pagamento</p><p>{FORMA_LABEL[c.formaPagamento]}</p></div>
        <div><p className="label">Período</p><p>{dateBR(c.inicio)} a {dateBR(c.fim)}</p></div>
        <div><p className="label">Vencimento</p><p>Todo dia {c.diaVencimento}</p></div>
        <div><p className="label">Recebido</p><p className="text-good">{money(recebido)}</p></div>
        <div><p className="label">Em aberto</p><p>{money(emAberto)}</p></div>
        {c.observacoes && <p className="text-sm text-ink-soft sm:col-span-2 lg:col-span-4">{c.observacoes}</p>}
      </section>

      <h2 className="mb-3 font-semibold">Pontos do contrato</h2>
      <div className="card table-wrap mb-6">
        <table className="table">
          <thead>
            <tr><th>Ponto</th><th>Tipo</th><th>Valor mensal</th><th>Início</th><th>Prazo</th><th>Fim</th></tr>
          </thead>
          <tbody>
            {c.pontos.map((cp) => (
              <tr key={cp.pontoId}>
                <td className="font-medium">{cp.ponto.nome}</td>
                <td>{TIPO_SINGULAR[cp.ponto.tipo]}</td>
                <td>{money(cp.valor)}</td>
                <td>{dateBR(cp.inicio)}</td>
                <td>{cp.prazoMeses} meses</td>
                <td>{dateBR(cp.fim)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 font-semibold">Parcelas</h2>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Nº</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Recebimento</th></tr>
          </thead>
          <tbody>
            {c.parcelas.map((p) => (
              <tr key={p.id}>
                <td>{p.numero}/{c.parcelas.length}</td>
                <td>{dateBR(p.vencimento)}</td>
                <td>{money(p.valor)}</td>
                <td><StatusBadge status={statusParcela(p)} /></td>
                <td>
                  <ReceberParcela
                    id={p.id}
                    valor={Number(p.valor)}
                    forma={c.formaPagamento}
                    volta={volta}
                    pagoEm={p.pagoEm}
                    formaRecebida={p.formaRecebida}
                    pode={podeReceber(user.papel)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edita && (
        <div className="mt-6 flex flex-wrap gap-2">
          {c.status === "ATIVO" ? (
            <>
              <form action={mudarStatusContrato.bind(null, id, "ENCERRADO")}>
                <button className="btn btn-sm" type="submit">Encerrar contrato</button>
              </form>
              <form action={mudarStatusContrato.bind(null, id, "CANCELADO")}>
                <button className="btn btn-sm btn-danger" type="submit">Cancelar contrato</button>
              </form>
            </>
          ) : (
            <form action={mudarStatusContrato.bind(null, id, "ATIVO")}>
              <button className="btn btn-sm" type="submit">Reativar contrato</button>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
