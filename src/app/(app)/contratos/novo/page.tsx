import Flash from "@/components/Flash";
import PontosDoContrato from "@/components/PontosDoContrato";
import { criarContrato } from "@/app/actions/contratos";
import { requireUser } from "@/lib/auth";
import { isoDate, hoje } from "@/lib/format";
import { FORMAS, FORMA_LABEL, TIPOS, TIPO_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novo contrato" };

export default async function NovoContrato({ searchParams }: { searchParams: Promise<{ erro?: string; cliente?: string }> }) {
  const [, { erro, cliente }] = await Promise.all([requireUser("COMERCIAL"), searchParams]);
  const h = hoje();
  const [clientes, pontos] = await Promise.all([
    prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.ponto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: { contratos: { where: { contrato: { status: "ATIVO" } }, select: { inicio: true, fim: true } } },
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

        <PontosDoContrato
          hojeISO={isoDate(hoje())}
          grupos={TIPOS.map((t) => ({
            titulo: TIPO_LABEL[t],
            pontos: pontos
              .filter((p) => p.tipo === t)
              .map((p) => {
                const agora = p.contratos.filter((c) => c.inicio <= h && h <= c.fim).length;
                return { id: p.id, nome: p.nome, ocupacao: p.cotas ? `${agora}/${p.cotas} cotas hoje` : agora > 0 ? `${agora} cliente(s) hoje` : null, lotado: Boolean(p.cotas && agora >= p.cotas) };
              }),
          })).filter((g) => g.pontos.length > 0)}
        />

        <div>
          <label className="label" htmlFor="formaPagamento">Forma de pagamento</label>
          <select className="input" id="formaPagamento" name="formaPagamento" defaultValue="PIX">
            {FORMAS.map((f) => <option key={f} value={f}>{FORMA_LABEL[f]}</option>)}
          </select>
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
