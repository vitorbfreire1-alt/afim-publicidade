import Flash from "@/components/Flash";
import MaskedInput from "@/components/MaskedInput";
import { criarDespesa } from "@/app/actions/despesas";
import { requireUser } from "@/lib/auth";
import { hoje, isoDate } from "@/lib/format";
import { CATEGORIAS, CATEGORIA_LABEL, TIPO_SINGULAR } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova despesa" };

export default async function NovaDespesa({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const [, { erro }] = await Promise.all([requireUser("despesas"), searchParams]);
  const pontos = await prisma.ponto.findMany({ where: { ativo: true }, orderBy: [{ tipo: "asc" }, { nome: "asc" }] });

  return (
    <main className="max-w-2xl">
      <h1 className="mb-5">Nova despesa</h1>
      <Flash erro={erro} />
      <form action={criarDespesa} className="card grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="descricao">Descrição</label>
          <input className="input" id="descricao" name="descricao" placeholder="Ex.: Energia do painel da Praça" required />
        </div>
        <div>
          <label className="label" htmlFor="categoria">Categoria</label>
          <select className="input" id="categoria" name="categoria" defaultValue="OUTROS">
            {CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fornecedor">Fornecedor (opcional)</label>
          <input className="input" id="fornecedor" name="fornecedor" />
        </div>
        <div>
          <label className="label" htmlFor="valor">Valor (R$)</label>
          <MaskedInput className="input" id="valor" name="valor" mask="dinheiro" placeholder="1.500,00" required />
        </div>
        <div>
          <label className="label" htmlFor="vencimento">Vencimento</label>
          <input className="input" id="vencimento" name="vencimento" type="date" defaultValue={isoDate(hoje())} required />
        </div>
        <div>
          <label className="label" htmlFor="repetir">Repetir por (meses)</label>
          <input className="input" id="repetir" name="repetir" type="number" min={1} max={60} defaultValue={1} required />
          <p className="mt-1 text-xs text-ink-faint">Para contas fixas (energia, aluguel): cria uma por mês, no mesmo dia.</p>
        </div>
        <div>
          <label className="label" htmlFor="pontoId">Ponto (opcional)</label>
          <select className="input" id="pontoId" name="pontoId" defaultValue="">
            <option value="">Despesa geral</option>
            {pontos.map((p) => <option key={p.id} value={p.id}>{TIPO_SINGULAR[p.tipo]} · {p.nome}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="observacoes">Observações</label>
          <textarea className="input" id="observacoes" name="observacoes" rows={2} />
        </div>
        <div className="sm:col-span-2">
          <button className="btn btn-gold w-full sm:w-auto" type="submit">Cadastrar despesa</button>
        </div>
      </form>
    </main>
  );
}
