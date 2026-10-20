import Link from "next/link";
import { Plus } from "lucide-react";
import Flash from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { dateBR, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manutenção" };

const FILTROS = { abertas: "Abertas", resolvidas: "Resolvidas", todas: "Todas" } as const;
type Filtro = keyof typeof FILTROS;
const TIPO_LABEL = { DEFEITO: "Defeito", MANUTENCAO_PREVENTIVA: "Preventiva", LIMPEZA: "Limpeza", TROCA_PECA: "Troca de peça", OUTRO: "Outro" } as const;
const STATUS_LABEL = { ABERTA: "Aberta", EM_ANDAMENTO: "Em andamento", RESOLVIDA: "Resolvida" } as const;

export default async function Ocorrencias({ searchParams }: { searchParams: Promise<{ f?: string; erro?: string; ok?: string }> }) {
  const [, sp] = await Promise.all([requireUser(), searchParams]);
  const f: Filtro = sp.f && sp.f in FILTROS ? (sp.f as Filtro) : "abertas";
  const lista = await prisma.ocorrencia.findMany({
    where: f === "abertas" ? { status: { not: "RESOLVIDA" } } : f === "resolvidas" ? { status: "RESOLVIDA" } : {},
    orderBy: { abertaEm: "desc" },
    take: 200,
    include: { ponto: true },
  });

  return (
    <main>
      <Flash erro={sp.erro} ok={sp.ok} />
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1>Manutenção</h1>
        <Link className="btn btn-gold" href="/ocorrencias/nova"><Plus className="size-4" /> Nova ocorrência</Link>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(Object.keys(FILTROS) as Filtro[]).map((k) => (
          <Link key={k} href={`/ocorrencias?f=${k}`} className={`btn btn-sm whitespace-nowrap ${k === f ? "btn-gold" : ""}`}>{FILTROS[k]}</Link>
        ))}
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Ocorrência</th><th>Ponto</th><th>Tipo</th><th>Aberta em</th><th>Situação</th><th>Custo</th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={6} className="text-ink-soft">Nenhuma ocorrência.</td></tr>}
            {lista.map((o) => (
              <tr key={o.id}>
                <td><Link className="font-medium hover:text-gold-soft" href={`/ocorrencias/${o.id}`}>{o.titulo}</Link></td>
                <td>{o.ponto.nome}</td>
                <td>{TIPO_LABEL[o.tipo]}</td>
                <td className="whitespace-nowrap">{dateBR(o.abertaEm)}</td>
                <td><span className={`badge ${o.status === "RESOLVIDA" ? "text-good" : o.status === "ABERTA" ? "text-danger" : "text-warn"}`}>{STATUS_LABEL[o.status]}</span></td>
                <td>{o.custo ? money(o.custo) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
