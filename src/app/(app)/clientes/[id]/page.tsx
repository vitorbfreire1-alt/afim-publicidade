import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import Flash from "@/components/Flash";
import ClienteForm from "@/components/ClienteForm";
import { alternarCliente, atualizarCliente } from "@/app/actions/clientes";
import { mudarStatusContrato } from "@/app/actions/contratos";
import { pode, requireUser } from "@/lib/auth";
import { filtroEmAtraso, valorMensalAtual } from "@/lib/financeiro";
import SeloVencimento from "@/components/SeloVencimento";
import { dateBR, money } from "@/lib/format";
import { STATUS_CONTRATO_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const [user, { id }, { erro, ok }] = await Promise.all([requireUser("clientes"), params, searchParams]);
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { contratos: { orderBy: { numero: "desc" }, include: { pontos: { include: { ponto: true } } } } },
  });
  if (!cliente) notFound();

  const atraso = await prisma.parcela.aggregate({
    where: { ...filtroEmAtraso(), contrato: { clienteId: id, status: "ATIVO" } },
    _sum: { valor: true },
  });
  const edita = pode(user, "editar");
  const v = pode(user, "valores");
  const verContratos = pode(user, "carteira");

  return (
    <main className="max-w-3xl">
      <Flash erro={erro} ok={ok} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{cliente.nome}{!cliente.ativo && " (desativado)"}</h1>
        {v && Number(atraso._sum.valor ?? 0) > 0 && (
          <span className="badge text-danger">Inadimplência: {money(atraso._sum.valor)}</span>
        )}
      </div>

      {edita ? (
        <ClienteForm cliente={cliente} action={atualizarCliente.bind(null, id)} label="Salvar alterações" />
      ) : (
        <p className="card p-4 text-sm text-ink-soft">
          {cliente.contato ?? "—"} · {cliente.telefone ?? "—"} · {cliente.email ?? "—"}
        </p>
      )}

      {verContratos && (
      <>
      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Contratos</h2>
        {pode(user, "receber") && <Link className="btn btn-sm" href={`/extrato/${id}`} target="_blank">Extrato (imprimir)</Link>}
        {edita && v && cliente.ativo && (
          <Link className="btn btn-sm btn-gold" href={`/contratos/novo?cliente=${id}`}>+ Novo contrato</Link>
        )}
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Nº</th><th>Pontos</th>{v && <th>Mensal</th>}<th>Período</th><th>Status</th>{edita && <th></th>}</tr>
          </thead>
          <tbody>
            {cliente.contratos.length === 0 && <tr><td colSpan={6} className="text-ink-soft">Sem contratos.</td></tr>}
            {cliente.contratos.map((c) => (
              <tr key={c.id}>
                <td><Link className="font-medium text-gold" href={`/contratos/${c.id}`}>#{c.numero}</Link></td>
                <td>{c.pontos.map((p) => p.ponto.nome).join(", ")}</td>
                {v && <td>{money(valorMensalAtual(c.pontos))}</td>}
                <td className="whitespace-nowrap">{dateBR(c.inicio)} – {dateBR(c.fim)} <SeloVencimento fim={c.fim} ativo={c.status === "ATIVO"} /></td>
                <td>{STATUS_CONTRATO_LABEL[c.status]}</td>
                {edita && (
                  <td>
                    {c.status === "ATIVO" ? (
                      <form action={mudarStatusContrato.bind(null, c.id, "CANCELADO", `/clientes/${id}`)}>
                        <ConfirmButton className="btn btn-sm btn-danger" mensagem={`Desativar o contrato #${c.numero}? Ele sai da carteira e da inadimplência.`}>
                          Desativar
                        </ConfirmButton>
                      </form>
                    ) : (
                      <form action={mudarStatusContrato.bind(null, c.id, "ATIVO", `/clientes/${id}`)}>
                        <ConfirmButton className="btn btn-sm" mensagem={`Reativar o contrato #${c.numero}?`}>Reativar</ConfirmButton>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {edita && (
        <form action={alternarCliente.bind(null, id)} className="mt-6">
          <button className="btn btn-sm btn-danger" type="submit">
            {cliente.ativo ? "Desativar cliente" : "Reativar cliente"}
          </button>
        </form>
      )}
    </main>
  );
}
