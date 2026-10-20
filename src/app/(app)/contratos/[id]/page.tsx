import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { FileText, Link2, Receipt } from "lucide-react";
import Anexos from "@/components/Anexos";
import BotaoWhatsapp from "@/components/BotaoWhatsapp";
import ConfirmButton from "@/components/ConfirmButton";
import Flash from "@/components/Flash";
import MaskedInput from "@/components/MaskedInput";
import ReceberParcela from "@/components/ReceberParcela";
import StatusBadge from "@/components/StatusBadge";
import { adicionarPonto, alterarValorPonto, aplicarReajuste, editarContrato, editarParcela, encerrarPonto, mudarStatusContrato, renovarPonto } from "@/app/actions/contratos";
import { desativarLinkPublico, gerarLinkPublico } from "@/app/actions/publico";
import FormAcordo from "@/components/FormAcordo";
import { podeEditarCadastros, podeReceber, requireUser } from "@/lib/auth";
import { FORMAS, FORMA_LABEL as FORMA_ROTULO } from "@/lib/labels";
import { statusParcela, valorMensalAtual } from "@/lib/financeiro";
import { addDias, dateBR, hoje, isoDate, money } from "@/lib/format";
import { linkCobranca } from "@/lib/whatsapp";
import { calcularEncargos, regrasDe } from "@/lib/encargos";
import { getConfig } from "@/lib/config";
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
      reajustes: { orderBy: { aplicadoEm: "desc" } },
      vendedor: true,
      acordos: { orderBy: { criadoEm: "desc" } },
    },
  });
  if (!c) notFound();
  const vendedores = await prisma.usuario.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
  const disponiveis = await prisma.ponto.findMany({
    where: { ativo: true, id: { notIn: c.pontos.map((p) => p.pontoId) } },
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
  });

  const volta = `/contratos/${id}`;
  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const regras = regrasDe(await getConfig());
  const atualizado = (p: (typeof c.parcelas)[number]) => (p.pagoEm || p.renegociadaEm ? null : calcularEncargos(Number(p.valor), p.vencimento, regras).total);
  const recebido = c.parcelas.reduce((s, p) => s + Number(p.valorPago ?? 0), 0);
  const emAberto = c.parcelas.filter((p) => !p.pagoEm && !p.renegociadaEm).reduce((s, p) => s + Number(p.valor), 0);
  const edita = podeEditarCadastros(user.papel);
  const hojeD = hoje();
  const vencidas = c.parcelas
    .filter((p) => !p.pagoEm && !p.renegociadaEm && p.vencimento < hojeD)
    .map((p) => ({ id: p.id, rotulo: `${p.numero}/${c.parcelas.length} · venceu ${dateBR(p.vencimento)}`, atualizado: calcularEncargos(Number(p.valor), p.vencimento, regras).total }));
  const proximoMes = addDias(hojeD, 30);

  return (
    <main>
      <Flash erro={erro} ok={ok} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Contrato #{c.numero}</h1>
          <Link className="text-gold hover:underline" href={`/clientes/${c.clienteId}`}>{c.cliente.nome}</Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="btn btn-sm" href={`/contratos/${id}/imprimir`} target="_blank"><FileText className="size-4" /> Imprimir contrato</Link>
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
        {c.vendedor && <div><p className="label">Vendedor</p><p>{c.vendedor.nome}{c.comissaoPct != null && ` · ${Number(c.comissaoPct)}%`}</p></div>}
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
                      <summary className="btn btn-sm cursor-pointer list-none">Ações</summary>
                      <div className="card mt-2 grid min-w-72 gap-4 p-3">
                        <form action={renovarPonto.bind(null, id, cp.pontoId)} className="grid gap-2">
                          <p className="text-xs font-semibold text-gold-soft">Renovar</p>
                          <input className="input" name="meses" type="number" min={1} max={120} defaultValue={12} required aria-label="Renovar por (meses)" />
                          <MaskedInput className="input" name="valor" mask="dinheiro" placeholder="Novo valor (opcional)" aria-label="Novo valor mensal (opcional)" />
                          <button className="btn btn-sm btn-gold" type="submit">Renovar por N meses</button>
                        </form>
                        <form action={alterarValorPonto.bind(null, id, cp.pontoId)} className="grid gap-2 border-t border-line pt-3">
                          <p className="text-xs font-semibold text-gold-soft">Alterar valor mensal (parcelas futuras)</p>
                          <MaskedInput className="input" name="valor" mask="dinheiro" defaultValue={Number(cp.valor).toFixed(2).replace(".", ",")} required aria-label="Novo valor mensal" />
                          <ConfirmButton className="btn btn-sm" mensagem="Alterar o valor das parcelas futuras ainda não pagas deste ponto?">Alterar valor</ConfirmButton>
                        </form>
                        {c.pontos.length > 1 && (
                          <form action={encerrarPonto.bind(null, id, cp.pontoId)} className="grid gap-2 border-t border-line pt-3">
                            <p className="text-xs font-semibold text-danger">Encerrar este ponto (ou trocar por outro)</p>
                            <input className="input" name="data" type="date" defaultValue={isoDate(hoje())} required aria-label="Encerrar em" />
                            <ConfirmButton className="btn btn-sm btn-danger" mensagem="Encerrar este ponto na data escolhida? As parcelas posteriores deixam de cobrá-lo.">Encerrar ponto</ConfirmButton>
                            <p className="text-xs text-ink-faint">Para trocar de ponto, encerre este e depois adicione o novo.</p>
                          </form>
                        )}
                      </div>
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

      {edita && c.status === "ATIVO" && (
        <details className="card mb-6 p-4">
          <summary className="cursor-pointer font-semibold text-gold">Editar contrato</summary>
          <form action={editarContrato.bind(null, id)} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="formaPagamento">Forma de pagamento</label>
              <select className="input" id="formaPagamento" name="formaPagamento" defaultValue={c.formaPagamento}>
                {FORMAS.map((f) => <option key={f} value={f}>{FORMA_ROTULO[f]}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="diaVencimentoEd">Dia do vencimento (1 a 28)</label>
              <input className="input" id="diaVencimentoEd" name="diaVencimento" type="number" min={1} max={28} defaultValue={c.diaVencimento} required />
              <p className="mt-1 text-xs text-ink-faint">Move as parcelas ainda não pagas para o novo dia.</p>
            </div>
            <div>
              <label className="label" htmlFor="vendedorIdEd">Vendedor</label>
              <select className="input" id="vendedorIdEd" name="vendedorId" defaultValue={c.vendedorId ?? ""}>
                <option value="">Sem vendedor</option>
                {vendedores.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="comissaoPctEd">Comissão (%)</label>
              <input className="input" id="comissaoPctEd" name="comissaoPct" inputMode="decimal" defaultValue={c.comissaoPct != null ? String(Number(c.comissaoPct)) : ""} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="observacoesEd">Observações</label>
              <textarea className="input" id="observacoesEd" name="observacoes" rows={2} defaultValue={c.observacoes ?? ""} />
            </div>
            <div className="sm:col-span-2"><button className="btn btn-gold" type="submit">Salvar alterações</button></div>
          </form>
        </details>
      )}

      {podeReceber(user.papel) && c.status === "ATIVO" && vencidas.length > 0 && (
        <details className="card mb-6 p-4">
          <summary className="cursor-pointer font-semibold text-warn">Negociar dívida ({vencidas.length} parcela(s) vencida(s))</summary>
          <FormAcordo contratoId={id} parcelas={vencidas} hojeISO={isoDate(hoje())} mesQueVemISO={isoDate(proximoMes)} />
        </details>
      )}

      {c.acordos.length > 0 && (
        <section className="card mb-6 p-4">
          <h2 className="mb-2 text-sm font-semibold text-gold-soft">Acordos de dívida</h2>
          <ul className="divide-y divide-white/5 text-sm">
            {c.acordos.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/acordos/${a.id}`} className="hover:text-gold-soft">Acordo #{a.numero} · {dateBR(a.criadoEm)}</Link>
                <span className="font-semibold tabular-nums">{money(a.totalAcordado)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(edita || c.reajustes.length > 0) && (
        <details className="card mb-6 p-4" open={c.reajustes.length > 0 && false}>
          <summary className="cursor-pointer font-semibold text-gold">Reajuste anual{c.reajustes.length > 0 && ` · ${c.reajustes.length} aplicado(s)`}</summary>
          {edita && c.status === "ATIVO" && (
            <form action={aplicarReajuste.bind(null, id)} className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="percentual">Percentual (%)</label>
                <input className="input" id="percentual" name="percentual" inputMode="decimal" placeholder="4,5" required />
              </div>
              <div>
                <label className="label" htmlFor="indice">Índice</label>
                <select className="input" id="indice" name="indice" defaultValue="IGP-M">
                  <option>IGP-M</option><option>IPCA</option><option>Acordo</option><option>Outro</option>
                </select>
              </div>
              <div className="flex items-end">
                <ConfirmButton className="btn btn-gold w-full" mensagem="Aplicar o reajuste nas parcelas futuras não pagas? Isso altera os valores a receber.">
                  Aplicar reajuste
                </ConfirmButton>
              </div>
              <p className="text-xs text-ink-faint sm:col-span-3">Atualiza as parcelas futuras ainda não pagas e o valor mensal dos pontos vigentes. Parcelas já pagas ou vencidas não mudam.</p>
            </form>
          )}
          {c.reajustes.length > 0 && (
            <ul className="mt-3 divide-y divide-white/5 text-sm">
              {c.reajustes.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 py-2">
                  <span>{dateBR(r.aplicadoEm)} · {r.indice} <strong className="text-gold-soft">{Number(r.percentual) > 0 ? "+" : ""}{Number(r.percentual).toString().replace(".", ",")}%</strong></span>
                  <span className="text-xs text-ink-faint">{r.usuarioNome}</span>
                </li>
              ))}
            </ul>
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
                <td className="whitespace-nowrap">
                  {money(p.valor)}
                  {(() => { const a = atualizado(p); return a && a > Number(p.valor) ? <span className="block text-xs text-danger">atualizado {money(a)}</span> : null; })()}
                </td>
                <td><StatusBadge status={statusParcela(p)} /></td>
                <td>
                  {p.renegociadaEm ? (
                    <span className="text-xs text-ink-soft">Renegociada{p.renegociadaNoId && <> · <Link className="text-gold hover:underline" href={`/acordos/${p.renegociadaNoId}`}>ver acordo</Link></>}</span>
                  ) : (
                  <div className="flex flex-wrap items-start gap-2">
                  <ReceberParcela
                    id={p.id}
                    valor={atualizado(p) ?? Number(p.valor)}
                    forma={c.formaPagamento}
                    volta={volta}
                    pagoEm={p.pagoEm}
                    formaRecebida={p.formaRecebida}
                    pode={podeReceber(user.papel)}
                  />
                  {podeReceber(user.papel) && !p.pagoEm && (
                    <details>
                      <summary className="btn btn-sm cursor-pointer list-none">Editar</summary>
                      <form action={editarParcela.bind(null, p.id, volta)} className="card mt-2 grid min-w-60 gap-2 p-3">
                        <div>
                          <label className="label">Valor</label>
                          <MaskedInput className="input" name="valor" mask="dinheiro" defaultValue={Number(p.valor).toFixed(2).replace(".", ",")} required />
                        </div>
                        <div>
                          <label className="label">Vencimento</label>
                          <input className="input" name="vencimento" type="date" defaultValue={isoDate(p.vencimento)} required />
                        </div>
                        <div>
                          <label className="label">Motivo (opcional)</label>
                          <input className="input" name="observacoes" defaultValue={p.observacoes ?? ""} placeholder="Ex.: desconto, prorrogação" />
                        </div>
                        <button className="btn btn-gold" type="submit">Salvar parcela</button>
                      </form>
                    </details>
                  )}
                  </div>
                  )}
                </td>
                <td>
                  {p.pagoEm && (
                    <Link className="btn btn-sm" href={`/recibo/${p.id}`} target="_blank"><Receipt className="size-3.5" /> Recibo</Link>
                  )}
                  {!p.pagoEm && !p.renegociadaEm && (
                    <BotaoWhatsapp
                      href={linkCobranca({ cliente: c.cliente, numero: p.numero, total: c.parcelas.length, vencimento: p.vencimento, valor: p.valor, atualizado: atualizado(p) ?? undefined })}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <div className="mt-8 space-y-6">
        <section className="card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-soft"><Link2 className="size-4" /> Relatório de veiculação para o cliente</h2>
          <p className="mb-3 text-xs text-ink-soft">Gere um link para o cliente ver as fotos de veiculação deste contrato, sem login e sem mostrar valores.</p>
          {c.tokenPublico ? (
            <div className="space-y-2">
              <input className="input !text-sm" readOnly value={`${origem}/r/${c.tokenPublico}`} aria-label="Link público" />
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-sm" href={`/r/${c.tokenPublico}`} target="_blank" rel="noopener noreferrer">Abrir relatório</a>
                {edita && (
                  <form action={desativarLinkPublico.bind(null, id)}>
                    <ConfirmButton className="btn btn-sm btn-danger" mensagem="Desativar o link? Quem tiver o endereço deixará de conseguir abrir.">Desativar link</ConfirmButton>
                  </form>
                )}
              </div>
            </div>
          ) : (
            edita && <form action={gerarLinkPublico.bind(null, id)}><button className="btn btn-sm btn-gold" type="submit">Gerar link do relatório</button></form>
          )}
        </section>

        <Anexos titulo="Comprovação de veiculação (fotos)" onde={{ contratoId: id, categoria: "VEICULACAO" }} dono={{ contratoId: id }} categorias={["VEICULACAO"]} volta={volta} podeEditar={edita} comData />
        <Anexos titulo="Contrato assinado e comprovantes" onde={{ contratoId: id, categoria: { not: "VEICULACAO" } }} dono={{ contratoId: id }} categorias={["CONTRATO_ASSINADO", "COMPROVANTE", "OUTRO"]} volta={volta} podeEditar={edita} />
      </div>
    </main>
  );
}
