import Link from "next/link";
import Flash from "@/components/Flash";
import { podeEditarCadastros, requireUser } from "@/lib/auth";
import { TIPOS, TIPO_LABEL, isTipo } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pontos de mídia" };

export default async function Pontos({ searchParams }: { searchParams: Promise<{ tipo?: string; erro?: string; ok?: string }> }) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const tipo = isTipo(sp.tipo) ? sp.tipo : "LED";
  const pontos = await prisma.ponto.findMany({
    where: { tipo },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: {
      contratos: { where: { contrato: { status: "ATIVO" } }, include: { contrato: { include: { cliente: true } } } },
    },
  });

  return (
    <main>
      <Flash erro={sp.erro} ok={sp.ok} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Pontos de mídia</h1>
        {podeEditarCadastros(user.papel) && (
          <Link className="btn btn-gold" href={`/pontos/novo?tipo=${tipo}`}>+ Novo ponto</Link>
        )}
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {TIPOS.map((t) => (
          <Link key={t} href={`/pontos?tipo=${t}`} className={`btn btn-sm whitespace-nowrap ${t === tipo ? "btn-gold" : ""}`}>
            {TIPO_LABEL[t]}
          </Link>
        ))}
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Ponto</th><th>Endereço</th><th>Clientes ativos</th></tr>
          </thead>
          <tbody>
            {pontos.length === 0 && <tr><td colSpan={3} className="text-ink-soft">Nenhum ponto cadastrado.</td></tr>}
            {pontos.map((p) => {
              return (
                <tr key={p.id} className={p.ativo ? "" : "opacity-50"}>
                  <td><Link className="font-medium hover:text-gold" href={`/pontos/${p.id}`}>{p.nome}</Link></td>
                  <td>{p.endereco ?? "—"}</td>
                  <td>
                    {!p.ativo ? "Desativado" : p.contratos.length === 0 ? (
                      <span className="text-good">Sem clientes</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {p.contratos.map(({ contrato: c }) => (
                          <li key={c.id}>
                            <Link className="text-warn hover:underline" href={`/contratos/${c.id}`}>{c.cliente.nome}</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
