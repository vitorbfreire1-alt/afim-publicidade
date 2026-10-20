import Link from "next/link";
import { Plus } from "lucide-react";
import Flash from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { dateBR, hoje, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propostas" };

const COLUNAS = [
  { status: "ENVIADA", titulo: "Enviadas", cor: "text-gold-soft" },
  { status: "NEGOCIANDO", titulo: "Negociando", cor: "text-warn" },
  { status: "FECHADA", titulo: "Fechadas", cor: "text-good" },
  { status: "PERDIDA", titulo: "Perdidas", cor: "text-danger" },
] as const;

export default async function Propostas({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [, sp] = await Promise.all([requireUser("propostas"), searchParams]);
  const h = hoje();
  const propostas = await prisma.proposta.findMany({
    orderBy: { atualizadoEm: "desc" },
    take: 200,
    include: { cliente: true, vendedor: true, pontos: true },
  });
  const mensal = (p: (typeof propostas)[number]) => p.pontos.reduce((s, x) => s + Number(x.valor), 0);

  return (
    <main>
      <Flash erro={sp.erro} ok={sp.ok} />
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1>Propostas</h1>
        <Link className="btn btn-gold" href="/propostas/nova"><Plus className="size-4" /> Nova proposta</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {COLUNAS.map((col) => {
          const lista = propostas.filter((p) => p.status === col.status);
          const total = lista.reduce((s, p) => s + mensal(p), 0);
          return (
            <section key={col.status} className="min-w-0">
              <h2 className={`mb-2 flex items-center justify-between text-sm font-semibold ${col.cor}`}>
                {col.titulo} <span className="text-xs text-ink-faint">{lista.length} · {money(total)}/mês</span>
              </h2>
              <div className="space-y-2">
                {lista.length === 0 && <p className="card p-3 text-xs text-ink-faint">Nada aqui.</p>}
                {lista.map((p) => {
                  const vencida = p.validadeAte && p.validadeAte < h && (p.status === "ENVIADA" || p.status === "NEGOCIANDO");
                  return (
                    <Link key={p.id} href={`/propostas/${p.id}`} className="card block p-3 transition-colors hover:border-gold/50">
                      <p className="text-xs text-ink-faint">#{p.numero}{p.vendedor && ` · ${p.vendedor.nome.split(" ")[0]}`}</p>
                      <p className="truncate font-medium">{p.cliente.nome}</p>
                      <p className="mt-1 text-sm font-semibold text-grad">{money(mensal(p))}<span className="text-xs font-normal text-ink-faint"> /mês · {p.prazoMeses}m</span></p>
                      {p.validadeAte && (
                        <p className={`mt-1 text-xs ${vencida ? "text-danger" : "text-ink-faint"}`}>{vencida ? "Validade vencida em " : "Válida até "}{dateBR(p.validadeAte)}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
