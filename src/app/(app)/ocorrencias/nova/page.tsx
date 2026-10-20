import Flash from "@/components/Flash";
import { criarOcorrencia } from "@/app/actions/ocorrencias";
import { requireUser } from "@/lib/auth";
import { hoje, isoDate } from "@/lib/format";
import { TIPO_SINGULAR } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova ocorrência" };

export default async function NovaOcorrencia({ searchParams }: { searchParams: Promise<{ erro?: string; ponto?: string }> }) {
  const [, sp] = await Promise.all([requireUser(), searchParams]);
  const pontos = await prisma.ponto.findMany({ where: { ativo: true }, orderBy: [{ tipo: "asc" }, { nome: "asc" }] });
  return (
    <main className="max-w-2xl">
      <h1 className="mb-5">Nova ocorrência</h1>
      <Flash erro={sp.erro} />
      <form action={criarOcorrencia} className="card grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pontoId">Ponto</label>
          <select className="input" id="pontoId" name="pontoId" defaultValue={sp.ponto ?? ""} required>
            <option value="" disabled>Escolha…</option>
            {pontos.map((p) => <option key={p.id} value={p.id}>{TIPO_SINGULAR[p.tipo]} · {p.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tipo">Tipo</label>
          <select className="input" id="tipo" name="tipo" defaultValue="DEFEITO">
            <option value="DEFEITO">Defeito</option>
            <option value="MANUTENCAO_PREVENTIVA">Manutenção preventiva</option>
            <option value="LIMPEZA">Limpeza</option>
            <option value="TROCA_PECA">Troca de peça</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="abertaEm">Data</label>
          <input className="input" id="abertaEm" name="abertaEm" type="date" defaultValue={isoDate(hoje())} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="titulo">O que aconteceu</label>
          <input className="input" id="titulo" name="titulo" placeholder="Ex.: Módulo do canto inferior apagado" required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="descricao">Detalhes</label>
          <textarea className="input" id="descricao" name="descricao" rows={3} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="responsavel">Responsável / técnico</label>
          <input className="input" id="responsavel" name="responsavel" />
        </div>
        <div className="sm:col-span-2"><button className="btn btn-gold" type="submit">Registrar ocorrência</button></div>
      </form>
    </main>
  );
}
