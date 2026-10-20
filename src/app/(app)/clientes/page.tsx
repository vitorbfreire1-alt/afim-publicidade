import Link from "next/link";
import AbrirLink from "@/components/AbrirLink";
import Flash from "@/components/Flash";
import { pode, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes" };

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string; erro?: string; ok?: string }> }) {
  const [user, { q, erro, ok }] = await Promise.all([requireUser("clientes"), searchParams]);
  const clientes = await prisma.cliente.findMany({
    where: q ? { OR: [{ nome: { contains: q, mode: "insensitive" } }, { documento: { contains: q } }] } : undefined,
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: { _count: { select: { contratos: { where: { status: "ATIVO" } } } } },
  });

  return (
    <main>
      <Flash erro={erro} ok={ok} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Clientes</h1>
        {pode(user, "editar") && <Link className="btn btn-gold" href="/clientes/novo">+ Novo cliente</Link>}
      </div>
      <form className="mb-4">
        <input className="input" name="q" defaultValue={q} placeholder="Buscar por nome ou CPF/CNPJ" type="search" />
      </form>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Cliente</th><th>Contato</th><th>Telefone</th><th>Contratos ativos</th><th className="col-acao"><span className="sr-only">Ação</span></th></tr>
          </thead>
          <tbody>
            {clientes.length === 0 && (
              <tr><td colSpan={5} className="text-ink-soft">Nenhum cliente encontrado.</td></tr>
            )}
            {clientes.map((c) => (
              <tr key={c.id} className={c.ativo ? "" : "opacity-50"}>
                <td><Link className="font-medium hover:text-gold" href={`/clientes/${c.id}`}>{c.nome}</Link></td>
                <td>{c.contato ?? "—"}</td>
                <td>{c.telefone ?? "—"}</td>
                <td>{c._count.contratos}</td>
                <td className="col-acao"><AbrirLink href={`/clientes/${c.id}`} rotulo={`Abrir o cliente ${c.nome}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
