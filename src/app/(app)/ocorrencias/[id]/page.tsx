import Link from "next/link";
import { notFound } from "next/navigation";
import Anexos from "@/components/Anexos";
import Flash from "@/components/Flash";
import MaskedInput from "@/components/MaskedInput";
import { mudarStatusOcorrencia, resolverOcorrencia } from "@/app/actions/ocorrencias";
import { podeEditarCadastros, requireUser } from "@/lib/auth";
import { dateBR, hoje, isoDate, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TIPO_LABEL = { DEFEITO: "Defeito", MANUTENCAO_PREVENTIVA: "Manutenção preventiva", LIMPEZA: "Limpeza", TROCA_PECA: "Troca de peça", OUTRO: "Outro" } as const;
const STATUS_LABEL = { ABERTA: "Aberta", EM_ANDAMENTO: "Em andamento", RESOLVIDA: "Resolvida" } as const;

export default async function OcorrenciaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [user, { id }, sp] = await Promise.all([requireUser(), params, searchParams]);
  const o = await prisma.ocorrencia.findUnique({ where: { id }, include: { ponto: true } });
  if (!o) notFound();

  return (
    <main className="max-w-3xl space-y-5">
      <Flash erro={sp.erro} ok={sp.ok} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>{o.titulo}</h1>
          <Link className="text-gold hover:underline" href={`/pontos/${o.pontoId}`}>{o.ponto.nome}</Link>
        </div>
        <span className={`badge ${o.status === "RESOLVIDA" ? "text-good" : o.status === "ABERTA" ? "text-danger" : "text-warn"}`}>{STATUS_LABEL[o.status]}</span>
      </div>

      <section className="card grid gap-4 p-5 sm:grid-cols-3">
        <div><p className="label">Tipo</p><p>{TIPO_LABEL[o.tipo]}</p></div>
        <div><p className="label">Aberta em</p><p>{dateBR(o.abertaEm)}</p></div>
        <div><p className="label">Responsável</p><p>{o.responsavel ?? "—"}</p></div>
        {o.resolvidaEm && <div><p className="label">Resolvida em</p><p>{dateBR(o.resolvidaEm)}</p></div>}
        {o.custo && <div><p className="label">Custo</p><p>{money(o.custo)}</p></div>}
        {o.descricao && <p className="text-sm text-ink-soft sm:col-span-3">{o.descricao}</p>}
      </section>

      {o.status !== "RESOLVIDA" && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gold-soft">Atualizar</h2>
          {o.status === "ABERTA" && (
            <form action={mudarStatusOcorrencia.bind(null, id, "EM_ANDAMENTO")} className="mb-4">
              <button className="btn" type="submit">Marcar como em andamento</button>
            </form>
          )}
          <form action={resolverOcorrencia.bind(null, id)} className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="resolvidaEm">Resolvida em</label>
              <input className="input" id="resolvidaEm" name="resolvidaEm" type="date" defaultValue={isoDate(hoje())} />
            </div>
            <div>
              <label className="label" htmlFor="custo">Custo (R$, opcional)</label>
              <MaskedInput className="input" id="custo" name="custo" mask="dinheiro" placeholder="0,00" />
            </div>
            <div>
              <label className="label" htmlFor="responsavel">Quem resolveu</label>
              <input className="input" id="responsavel" name="responsavel" defaultValue={o.responsavel ?? ""} />
            </div>
            <p className="text-xs text-ink-faint sm:col-span-3">Se informar o custo, o sistema cria uma despesa de manutenção a pagar, ligada a este ponto.</p>
            <div className="sm:col-span-3"><button className="btn btn-gold" type="submit">Marcar como resolvida</button></div>
          </form>
        </section>
      )}

      <Anexos titulo="Fotos e comprovantes" onde={{ ocorrenciaId: id }} dono={{ ocorrenciaId: id }} categorias={["OUTRO", "COMPROVANTE"]} volta={`/ocorrencias/${id}`} podeEditar={podeEditarCadastros(user.papel)} />
    </main>
  );
}
