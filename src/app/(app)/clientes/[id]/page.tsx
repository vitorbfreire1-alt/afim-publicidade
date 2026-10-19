import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/Flash";
import ClienteForm from "@/components/ClienteForm";
import { alternarCliente, atualizarCliente } from "@/app/actions/clientes";
import { podeEditarCadastros, requireUser } from "@/lib/auth";
import { filtroEmAtraso } from "@/lib/financeiro";
import { dateBR, money } from "@/lib/format";
import { STATUS_CONTRATO_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const [user, { id }, { erro, ok }] = await Promise.all([requireUser(), params, searchParams]);
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { contratos: { orderBy: { numero: "desc" }, include: { pontos: { include: { ponto: true } } } } },
  });
  if (!cliente) notFound();

  const atraso = await prisma.parcela.aggregate({
    where: { ...filtroEmAtraso(), contrato: { clienteId: id, status: "ATIVO" } },
    _sum: { valor: true },
  });
  const edita = podeEditarCadastros(user.papel);

  return (
    <main className="max-w-3xl">
      <Flash erro={erro} ok={ok} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{cliente.nome}{!cliente.ativo && " (desativado)"}</h1>
        {Number(atraso._sum.valor ?? 0) > 0 && (
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

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="font-semibold">Contratos</h2>
        {edita && cliente.ativo && (
          <Link className="btn btn-sm btn-gold" href={`/contratos/novo?cliente=${id}`}>+ Novo contrato</Link>
        )}
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Nº</th><th>Pontos</th><th>Mensal</th><th>Período</th><th>Status</th></tr>
          </thead>
          <tbody>
            {cliente.contratos.length === 0 && <tr><td colSpan={5} className="text-ink-soft">Sem contratos.</td></tr>}
            {cliente.contratos.map((c) => (
              <tr key={c.id}>
                <td><Link className="font-medium text-gold" href={`/contratos/${c.id}`}>#{c.numero}</Link></td>
                <td>{c.pontos.map((p) => p.ponto.nome).join(", ")}</td>
                <td>{money(c.valorMensal)}</td>
                <td className="whitespace-nowrap">{dateBR(c.inicio)} – {dateBR(c.fim)}</td>
                <td>{STATUS_CONTRATO_LABEL[c.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
