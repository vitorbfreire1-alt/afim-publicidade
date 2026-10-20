import { notFound } from "next/navigation";
import BotaoImprimir from "@/components/BotaoImprimir";
import { dateBR } from "@/lib/format";
import { TIPO_SINGULAR } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatório de veiculação", robots: { index: false, follow: false } };

/** Página pública (sem login) com as comprovações de veiculação do contrato. Não mostra valores nem dados financeiros. */
export default async function RelatorioPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{30,64}$/.test(token)) notFound();
  const c = await prisma.contrato.findUnique({
    where: { tokenPublico: token },
    include: { cliente: true, pontos: { include: { ponto: true } } },
  });
  if (!c) notFound();
  const fotos = await prisma.arquivo.findMany({
    where: { contratoId: c.id, categoria: "VEICULACAO", mime: { startsWith: "image/" } },
    orderBy: [{ dataRef: "desc" }, { criadoEm: "desc" }],
    select: { id: true, descricao: true, dataRef: true, criadoEm: true },
  });
  const empresa = await prisma.config.findUnique({ where: { id: "singleton" } });

  return (
    <div className="doc">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#151515] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9a7416]">{empresa?.nomeFantasia || "AFIM Publicidade"}</p>
            <h1 className="mt-1 text-2xl font-bold">Relatório de veiculação</h1>
            <p className="text-sm text-[#555]">{c.cliente.nome} · Contrato #{c.numero}</p>
          </div>
          <BotaoImprimir />
        </header>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider">Pontos contratados</h2>
          <table>
            <thead><tr><th>Ponto</th><th>Tipo</th><th>Período</th></tr></thead>
            <tbody>
              {c.pontos.map((cp) => (
                <tr key={cp.pontoId}><td>{cp.ponto.nome}</td><td>{TIPO_SINGULAR[cp.ponto.tipo]}</td><td>{dateBR(cp.inicio)} a {dateBR(cp.fim)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">Comprovações ({fotos.length})</h2>
          {fotos.length === 0 ? (
            <p className="text-sm text-[#555]">Ainda não há fotos de veiculação registradas.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {fotos.map((f) => (
                <figure key={f.id} className="break-inside-avoid">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/publico/${token}/${f.id}`} alt={f.descricao ?? "Foto de veiculação"} className="aspect-[4/3] w-full rounded-lg border border-[#ddd] object-cover" loading="lazy" />
                  <figcaption className="mt-1 text-xs text-[#555]"><strong>{dateBR(f.dataRef ?? f.criadoEm)}</strong>{f.descricao && ` · ${f.descricao}`}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
        <footer className="mt-10 border-t border-[#ddd] pt-3 text-xs text-[#777]">Documento gerado pelo sistema da {empresa?.nomeFantasia || "AFIM Publicidade"}.</footer>
      </div>
    </div>
  );
}
