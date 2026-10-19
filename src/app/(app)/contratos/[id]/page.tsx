import Link from "next/link";
import { notFound } from "next/navigation";
import BotaoWhatsapp from "@/components/BotaoWhatsapp";
import ConfirmButton from "@/components/ConfirmButton";
import Flash from "@/components/Flash";
import MaskedInput from "@/components/MaskedInput";
import ReceberParcela from "@/components/ReceberParcela";
import StatusBadge from "@/components/StatusBadge";
import { adicionarPonto, mudarStatusContrato, renovarPonto } from "@/app/actions/contratos";
import { podeEditarCadastros, podeReceber, requireUser } from "@/lib/auth";
import { statusParcela, valorMensalAtual } from "@/lib/financeiro";
import { dateBR, hoje, isoDate, money } from "@/lib/format";
import { linkCobranca } from "@/lib/whatsapp";
import { FORMA_LABEL, STATUS_CONTRATO_LABEL, TIPO_SINGULAR } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ContratoPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const [user, { id }, { erro, ok }] = await Promise.all([requireUser(), params, searchParams]);
  const c = await prisma.contrato.findUnique({
    where: { id },
    include: {
      cliente: true,
      pontos: { include: { ponto: true } },
      parcelas: { orderBy: { numero: "asc" } },
    },
  });
  if (!c) notFound();
  const disponiveis = await prisma.ponto.findMany({
    where: { ativo: true, id: { notIn: c.pontos.map((p) => p.pontoId) } },
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
  });

  const volta = `/contratos/${id}`;
  const recebido = c.parcelas.reduce((s, p) => s + Number(p.valorPago ?? 0), 0);
  const emAberto = c.parcelas.filter((p) => !p.pagoEm).reduce((s, p) => s + Number(p.valor), 0);
  const edita = podeEditarCadastros(user.papel);

  return (
    <main>
      <Flash erro={erro} ok={ok} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Contrato #{c.numero}</h1>
          <Link className="text-gold hover:underline" href={`/clientes/${c.clienteId}`}>{c.cliente.nome}</Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge text-gold">{STATUS_CONTRATO_LABEL[c.status]}</span>
          {edita && c.status === "ATIVO" && (
            <>
              <form action={mudarStatusContrato.bind(null, id, "ENCERRADO", undefined)}>
                <ConfirmButton className="btn btn-sm" mensagem="Encerrar este contrato? Ele sai da carteira e da inadimplência.">
                  Encerrar
                </ConfirmButton>
              </form>
              <form action={mudarStatusContrato.bind(null, id, "CANCELADO", undefined)}>
                <ConfirmButton className="btn btn-sm btn-danger" mensagem="Cancelar este contrato? Ele sai da carteira e da inadimplência.">
                  Cancelar contrato
                </ConfirmButton>
              </form>
            </>
          )}
          {edita && c.status !== "ATIVO" && (
            <form action={mudarStatusContrato.bind(null, id, "ATIVO", undefined)}>
              <ConfirmButton className="btn btn-sm" mensagem="Reativar este contrato?">Reativar</ConfirmButton>
            </form>
          )}
        </div>
      </div>

      <section className="card mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="label">Valor mensal hoje</p><p className="font-semibold">{money(valorMensalAtual(c.pontos))}</p></div>
        <div><p className="label">Forma de pagamento</p><p>{FORMA_LABEL[c.formaPagamento]}</p></div>
        <div><p className="label">Período</p><p>{dateBR(c.inicio)} a {dateBR(c.fim)}</p></div>
        <div><p className="label">Vencimento</p><p>Todo dia {c.diaVencimento}</p></div>
        <div><p className="label">Recebido</p><p className="text-good">{money(recebido)}</p></div>
        <div><p className="label">Em aberto</p><p>{money(emAberto)}</p></div>
        {c.observacoes && <p className="text-sm text-ink-soft sm:col-span-2 lg:col-span-4">{c.observacoes}</p>}
      </section>

      <h2 className="mb-3 font-semibold">Pontos do contrato</h2>
      <div className="card table-wrap mb-6">
        <table className="table">
          <thead>
            <tr><th>Ponto</th><th>Tipo</th><th>Valor mensal</th><th>Início</th><th>Prazo</th><th>Fim</th>{edita && c.status === "ATIVO" && <th></th>}</tr>
          </thead>
          <tbody>
            {c.pontos.map((cp) => (
              <tr key={cp.pontoId}>
                <td className="font-medium">{cp.ponto.nome}</td>
                <td>{TIPO_SINGULAR[cp.ponto.tipo]}</td>
                <td>{money(cp.valor)}</td>
                <td>{dateBR(cp.inicio)}</td>
                <td>{cp.prazoMeses} meses</td>
                <td>{dateBR(cp.fim)}</td>
                {edita && c.status === "ATIVO" && (
                  <td>
                    <details>
                      <summary className="btn btn-sm cursor-pointer list-none">Renovar</summary>
                      <form action={renovarPonto.bind(null, id, cp.pontoId)} className="card mt-2 grid min-w-60 gap-2 p-3">
                        <div>
                          <label className="label">Renovar por (meses)</label>
                          <input className="input" name="meses" type="number" min={1} max={120} defaultValue={12} required />
                        </div>
                        <div>
                          <label className="label">Novo valor mensal (opcional)</label>
                          <MaskedInput className="input" name="valor" mask="dinheiro" placeholder={Number(cp.valor).toFixed(2).replace(".", ",")} />
                        </div>
                        <button className="btn btn-gold" type="submit">Renovar ponto</button>
                      </form>
                    </details>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edita && c.status === "ATIVO" && (
        <details className="card mb-6 p-4">
          <summary className="cursor-pointer font-semibold text-gold">+ Adicionar ponto a este contrato</summary>
          {disponiveis.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Todos os pontos ativos já estão neste contrato.</p>
          ) : (
            <form action={adicionarPonto.bind(null, id)} className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="pontoId">Ponto</label>
                <select className="input" id="pontoId" name="pontoId" required defaultValue="">
                  <option value="" disabled>Escolha…</option>
                  {disponiveis.map((p) => (
                    <option key={p.id} value={p.id}>{TIPO_SINGULAR[p.tipo]} · {p.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="valor">Valor mensal (R$)</label>
                <MaskedInput className="input" id="valor" name="valor" mask="dinheiro" placeholder="1.500,00" required />
              </div>
              <div>
                <label className="label" htmlFor="inicio">Início</label>
                <input className="input" id="inicio" name="inicio" type="date" defaultValue={isoDate(hoje())} required />
              </div>
              <div>
                <label className="label" htmlFor="prazoMeses">Prazo (meses)</label>
                <input className="input" id="prazoMeses" name="prazoMeses" type="number" min={1} max={120} defaultValue={12} required />
              </div>
              <div className="flex items-end">
                <button className="btn btn-gold w-full sm:w-auto" type="submit">Adicionar ponto</button>
              </div>
            </form>
          )}
        </details>
      )}

      <h2 className="mb-3 font-semibold">Parcelas</h2>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Nº</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Recebimento</th><th>Cobrança</th></tr>
          </thead>
          <tbody>
            {c.parcelas.map((p) => (
              <tr key={p.id}>
                <td>{p.numero}/{c.parcelas.length}</td>
                <td>{dateBR(p.vencimento)}</td>
                <td>{money(p.valor)}</td>
                <td><StatusBadge status={statusParcela(p)} /></td>
                <td>
                  <ReceberParcela
                    id={p.id}
                    valor={Number(p.valor)}
                    forma={c.formaPagamento}
                    volta={volta}
                    pagoEm={p.pagoEm}
                    formaRecebida={p.formaRecebida}
                    pode={podeReceber(user.papel)}
                  />
                </td>
                <td>
                  {!p.pagoEm && (
                    <BotaoWhatsapp
                      href={linkCobranca({ cliente: c.cliente, numero: p.numero, total: c.parcelas.length, vencimento: p.vencimento, valor: p.valor })}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </main>
  );
}
