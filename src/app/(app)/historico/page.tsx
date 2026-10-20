import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Histórico" };

const dataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const ENTIDADES = ["Contrato", "Parcela", "Despesa", "Cliente", "Ponto", "Proposta", "Ocorrência", "Arquivo", "Usuário", "Config"];

export default async function Historico({ searchParams }: { searchParams: Promise<{ e?: string; u?: string }> }) {
  const [, sp] = await Promise.all([requireUser("DONO"), searchParams]);
  const entidade = sp.e && ENTIDADES.includes(sp.e) ? sp.e : undefined;
  const eventos = await prisma.auditoria.findMany({
    where: { ...(entidade ? { entidade } : {}), ...(sp.u ? { usuarioNome: sp.u } : {}) },
    orderBy: { criadoEm: "desc" },
    take: 300,
  });
  const usuarios = await prisma.auditoria.findMany({ distinct: ["usuarioNome"], select: { usuarioNome: true }, orderBy: { usuarioNome: "asc" } });

  return (
    <main>
      <h1 className="mb-5">Histórico de alterações</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/historico" className={`btn btn-sm ${!entidade && !sp.u ? "btn-gold" : ""}`}>Tudo</Link>
        {ENTIDADES.map((e) => (
          <Link key={e} href={`/historico?e=${encodeURIComponent(e)}`} className={`btn btn-sm ${entidade === e ? "btn-gold" : ""}`}>{e}</Link>
        ))}
      </div>
      {usuarios.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          Por pessoa:
          {usuarios.map((u) => (
            <Link key={u.usuarioNome} href={`/historico?u=${encodeURIComponent(u.usuarioNome)}`} className={`btn btn-sm ${sp.u === u.usuarioNome ? "btn-gold" : ""}`}>{u.usuarioNome}</Link>
          ))}
        </div>
      )}
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Detalhe</th></tr></thead>
          <tbody>
            {eventos.length === 0 && <tr><td colSpan={4} className="text-ink-soft">Ainda não há registros. As próximas ações vão aparecer aqui.</td></tr>}
            {eventos.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap">{dataHora.format(e.criadoEm)}</td>
                <td>{e.usuarioNome}</td>
                <td className="whitespace-nowrap"><span className="text-gold-soft">{e.acao}</span> <span className="text-ink-faint">{e.entidade}</span></td>
                <td className="text-ink-soft">{e.resumo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-faint">Mostrando os 300 registros mais recentes.</p>
    </main>
  );
}
