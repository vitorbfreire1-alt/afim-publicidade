import Flash from "@/components/Flash";
import PontosDaProposta from "@/components/PontosDaProposta";
import { criarProposta } from "@/app/actions/propostas";
import { requireUser } from "@/lib/auth";
import { TIPOS, TIPO_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova proposta" };

export default async function NovaProposta({ searchParams }: { searchParams: Promise<{ erro?: string; cliente?: string }> }) {
  const [user, sp] = await Promise.all([requireUser("propostas"), searchParams]);
  const [clientes, pontos, usuarios] = await Promise.all([
    prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.ponto.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.usuario.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <main className="max-w-2xl">
      <h1 className="mb-5">Nova proposta</h1>
      <Flash erro={sp.erro} />
      <form action={criarProposta} className="card grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="clienteId">Cliente</label>
          <select className="input" id="clienteId" name="clienteId" defaultValue={sp.cliente ?? ""} required>
            <option value="" disabled>Escolha… (cadastre o cliente antes, se for novo)</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <PontosDaProposta
          grupos={TIPOS.map((t) => ({ titulo: TIPO_LABEL[t], pontos: pontos.filter((p) => p.tipo === t).map((p) => ({ id: p.id, nome: p.nome })) })).filter((g) => g.pontos.length > 0)}
        />
        <div>
          <label className="label" htmlFor="prazoMeses">Prazo (meses)</label>
          <input className="input" id="prazoMeses" name="prazoMeses" type="number" min={1} max={120} defaultValue={12} required />
        </div>
        <div>
          <label className="label" htmlFor="validadeAte">Proposta válida até</label>
          <input className="input" id="validadeAte" name="validadeAte" type="date" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="vendedorId">Vendedor</label>
          <select className="input" id="vendedorId" name="vendedorId" defaultValue={user.id}>
            <option value="">Sem vendedor</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="observacoes">Observações</label>
          <textarea className="input" id="observacoes" name="observacoes" rows={2} />
        </div>
        <div className="sm:col-span-2"><button className="btn btn-gold" type="submit">Criar proposta</button></div>
      </form>
    </main>
  );
}
