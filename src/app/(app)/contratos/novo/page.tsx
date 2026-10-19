import Flash from "@/components/Flash";
import { criarContrato } from "@/app/actions/contratos";
import { requireUser } from "@/lib/auth";
import { isoDate, hoje } from "@/lib/format";
import { FORMAS, FORMA_LABEL, TIPOS, TIPO_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novo contrato" };

export default async function NovoContrato({ searchParams }: { searchParams: Promise<{ erro?: string; cliente?: string }> }) {
  const [, { erro, cliente }] = await Promise.all([requireUser("COMERCIAL"), searchParams]);
  const [clientes, livres] = await Promise.all([
    prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.ponto.findMany({
      where: { ativo: true, contratos: { none: { contrato: { status: "ATIVO" } } } },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <main className="max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">Novo contrato</h1>
      <Flash erro={erro} />
      <form action={criarContrato} className="card grid gap-4 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="clienteId">Cliente</label>
          <select className="input" id="clienteId" name="clienteId" defaultValue={cliente ?? ""} required>
            <option value="" disabled>Escolha…</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="label">Pontos locados (só aparecem os livres)</legend>
          {livres.length === 0 && <p className="text-sm text-ink-soft">Nenhum ponto livre. Cadastre ou libere um ponto.</p>}
          {TIPOS.map((t) => {
            const doTipo = livres.filter((p) => p.tipo === t);
            if (!doTipo.length) return null;
            return (
              <div key={t} className="mb-2">
                <p className="text-xs font-semibold text-gold">{TIPO_LABEL[t]}</p>
                {doTipo.map((p) => (
                  <label key={p.id} className="flex min-h-10 items-center gap-2 text-sm">
                    <input type="checkbox" name="pontoIds" value={p.id} className="size-4 accent-[#d4a62a]" />
                    {p.nome}
                  </label>
                ))}
              </div>
            );
          })}
        </fieldset>

        <div>
          <label className="label" htmlFor="valorMensal">Valor mensal (R$)</label>
          <input className="input" id="valorMensal" name="valorMensal" inputMode="decimal" placeholder="1.500,00" required />
        </div>
        <div>
          <label className="label" htmlFor="formaPagamento">Forma de pagamento</label>
          <select className="input" id="formaPagamento" name="formaPagamento" defaultValue="PIX">
            {FORMAS.map((f) => <option key={f} value={f}>{FORMA_LABEL[f]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="inicio">Início do contrato</label>
          <input className="input" id="inicio" name="inicio" type="date" defaultValue={isoDate(hoje())} required />
        </div>
        <div>
          <label className="label" htmlFor="prazoMeses">Prazo (meses)</label>
          <input className="input" id="prazoMeses" name="prazoMeses" type="number" min={1} max={120} defaultValue={12} required />
        </div>
        <div>
          <label className="label" htmlFor="diaVencimento">Dia do vencimento (1 a 28)</label>
          <input className="input" id="diaVencimento" name="diaVencimento" type="number" min={1} max={28} defaultValue={10} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="observacoes">Observações</label>
          <textarea className="input" id="observacoes" name="observacoes" rows={2} />
        </div>
        <div className="sm:col-span-2">
          <button className="btn btn-gold w-full sm:w-auto" type="submit">Criar contrato e gerar parcelas</button>
        </div>
      </form>
    </main>
  );
}
