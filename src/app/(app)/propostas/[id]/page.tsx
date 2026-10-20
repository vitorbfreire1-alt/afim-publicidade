import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/Flash";
import ConfirmButton from "@/components/ConfirmButton";
import { excluirProposta, mudarStatusProposta } from "@/app/actions/propostas";
import { requireUser } from "@/lib/auth";
import { dateBR, money } from "@/lib/format";
import { TIPO_SINGULAR } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { ENVIADA: "Enviada", NEGOCIANDO: "Negociando", FECHADA: "Fechada", PERDIDA: "Perdida" } as const;

export default async function PropostaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [, { id }, sp] = await Promise.all([requireUser("propostas"), params, searchParams]);
  const p = await prisma.proposta.findUnique({ where: { id }, include: { cliente: true, vendedor: true, pontos: { include: { ponto: true } } } });
  if (!p) notFound();
  const mensal = p.pontos.reduce((s, x) => s + Number(x.valor), 0);
  const aberta = p.status === "ENVIADA" || p.status === "NEGOCIANDO";

  return (
    <main className="max-w-3xl">
      <Flash erro={sp.erro} ok={sp.ok} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Proposta #{p.numero}</h1>
          <Link className="text-gold hover:underline" href={`/clientes/${p.clienteId}`}>{p.cliente.nome}</Link>
        </div>
        <span className="badge text-gold">{STATUS_LABEL[p.status]}</span>
      </div>

      <section className="card mb-5 grid gap-4 p-5 sm:grid-cols-3">
        <div><p className="label">Valor mensal</p><p className="font-display text-lg font-bold text-grad">{money(mensal)}</p></div>
        <div><p className="label">Prazo</p><p>{p.prazoMeses} meses</p></div>
        <div><p className="label">Total do contrato</p><p>{money(mensal * p.prazoMeses)}</p></div>
        <div><p className="label">Válida até</p><p>{dateBR(p.validadeAte)}</p></div>
        <div><p className="label">Vendedor</p><p>{p.vendedor?.nome ?? "—"}</p></div>
        {p.motivoPerda && <div><p className="label">Motivo da perda</p><p>{p.motivoPerda}</p></div>}
        {p.observacoes && <p className="text-sm text-ink-soft sm:col-span-3">{p.observacoes}</p>}
      </section>

      <div className="card table-wrap mb-5">
        <table className="table">
          <thead><tr><th>Ponto</th><th>Tipo</th><th>Valor mensal</th></tr></thead>
          <tbody>
            {p.pontos.map((x) => (
              <tr key={x.pontoId}><td className="font-medium">{x.ponto.nome}</td><td>{TIPO_SINGULAR[x.ponto.tipo]}</td><td>{money(x.valor)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        {aberta && (
          <Link className="btn btn-gold" href={`/contratos/novo?proposta=${p.id}`}>Converter em contrato</Link>
        )}
        {p.contratoId && <Link className="btn" href={`/contratos/${p.contratoId}`}>Ver contrato</Link>}
        {aberta && p.status !== "NEGOCIANDO" && (
          <form action={mudarStatusProposta.bind(null, p.id, "NEGOCIANDO", undefined)}><button className="btn" type="submit">Marcar como negociando</button></form>
        )}
        {p.status === "NEGOCIANDO" && (
          <form action={mudarStatusProposta.bind(null, p.id, "ENVIADA", undefined)}><button className="btn" type="submit">Voltar para enviada</button></form>
        )}
        {aberta && (
          <details>
            <summary className="btn btn-danger cursor-pointer list-none">Marcar como perdida</summary>
            <form action={mudarStatusProposta.bind(null, p.id, "PERDIDA")} className="card mt-2 grid min-w-64 gap-2 p-3">
              <label className="label" htmlFor="motivoPerda">Motivo (opcional)</label>
              <input className="input" id="motivoPerda" name="motivoPerda" placeholder="Ex.: preço, escolheu concorrente" />
              <button className="btn btn-danger" type="submit">Confirmar</button>
            </form>
          </details>
        )}
        {p.status === "PERDIDA" && (
          <form action={mudarStatusProposta.bind(null, p.id, "ENVIADA", undefined)}><button className="btn" type="submit">Reabrir</button></form>
        )}
        {!p.contratoId && (
          <form action={excluirProposta.bind(null, p.id)}>
            <ConfirmButton className="btn btn-danger" mensagem="Excluir esta proposta?">Excluir</ConfirmButton>
          </form>
        )}
      </div>
    </main>
  );
}
