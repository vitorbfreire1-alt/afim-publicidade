import Link from "next/link";
import AbrirLink from "@/components/AbrirLink";
import Flash from "@/components/Flash";
import { pode, requireUser } from "@/lib/auth";
import { TIPOS, TIPO_LABEL, isTipo } from "@/lib/labels";
import { ocupadasEm } from "@/lib/cotas";
import { hoje } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pontos de mídia" };

function Ocupacao({ ocupadas, cotas }: { ocupadas: number; cotas: number }) {
  const cheio = ocupadas >= cotas;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <span className={`block h-full rounded-full ${cheio ? "bg-danger" : "bg-gold"}`} style={{ width: `${Math.min(100, (ocupadas / cotas) * 100)}%` }} />
      </span>
      <span className={cheio ? "font-semibold text-danger" : ""}>{ocupadas}/{cotas}{cheio && " · lotado"}</span>
    </span>
  );
}

export default async function Pontos({ searchParams }: { searchParams: Promise<{ tipo?: string; erro?: string; ok?: string }> }) {
  const [user, sp] = await Promise.all([requireUser("pontos"), searchParams]);
  const tipo = isTipo(sp.tipo) ? sp.tipo : "LED";
  const h = hoje();
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
        {pode(user, "editar") && (
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
            <tr><th>Ponto</th><th>Endereço</th><th>Cotas</th><th>Clientes ativos</th><th className="col-acao"><span className="sr-only">Ação</span></th></tr>
          </thead>
          <tbody>
            {pontos.length === 0 && <tr><td colSpan={5} className="text-ink-soft">Nenhum ponto cadastrado.</td></tr>}
            {pontos.map((p) => {
              return (
                <tr key={p.id} className={p.ativo ? "" : "opacity-50"}>
                  <td><Link className="font-medium hover:text-gold" href={`/pontos/${p.id}`}>{p.nome}</Link></td>
                  <td>{p.endereco ?? "—"}</td>
                  <td className="whitespace-nowrap">
                    {p.cotas ? <Ocupacao ocupadas={ocupadasEm(p.contratos, p.cotas, h)} cotas={p.cotas} /> : <span className="text-ink-faint">Sem limite</span>}
                  </td>
                  <td>
                    {!p.ativo ? "Desativado" : p.contratos.length === 0 ? (
                      <span className="text-good">Sem clientes</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {p.contratos.map(({ contrato: c, ocupaTudo }) => (
                          <li key={c.id}>
                            <Link className="text-warn hover:underline" href={`/contratos/${c.id}`}>{c.cliente.nome}</Link>{ocupaTudo && <span className="ml-1 text-xs text-ink-faint">· ponto inteiro</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="col-acao"><AbrirLink href={`/pontos/${p.id}`} rotulo={`Abrir o ponto ${p.nome}`} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
