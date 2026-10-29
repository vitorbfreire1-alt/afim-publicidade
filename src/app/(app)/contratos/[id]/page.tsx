import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { FileText, Link2, Receipt } from "lucide-react";
import Anexos from "@/components/Anexos";
import BotaoWhatsapp from "@/components/BotaoWhatsapp";
import AbasEdicao from "@/components/AbasEdicao";
import ConfirmButton from "@/components/ConfirmButton";
import Flash from "@/components/Flash";
import MaskedInput from "@/components/MaskedInput";
import ReceberParcela from "@/components/ReceberParcela";
import StatusBadge from "@/components/StatusBadge";
import { adicionarPonto, alterarValorPonto, alterarDatasPonto, alterarReservaPonto, aplicarReajuste, comecarControleEm, editarContrato, editarParcela, encerrarPonto, mudarStatusContrato, renovarPonto, trocarPonto } from "@/app/actions/contratos";
import { adicionarParcela, dividirParcela, dividirParcelasDoContrato, excluirParcela, reparcelarContrato } from "@/app/actions/parcelas";
import { desativarLinkPublico, gerarLinkPublico } from "@/app/actions/publico";
import FormAcordo from "@/components/FormAcordo";
import { pode, requireUser } from "@/lib/auth";
import SeloVencimento from "@/components/SeloVencimento";
import { FORMAS_CONTRATO, FORMA_LABEL as FORMA_ROTULO } from "@/lib/labels";
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
  const [user, { id }, { erro, ok }] = await Promise.all([requireUser("carteira"), params, searchParams]);
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
  const edita = pode(user, "editar");
  const hojeD = hoje();
  const vencidas = c.parcelas
    .filter((p) => !p.pagoEm && !p.renegociadaEm && p.vencimento < hojeD)
    .map((p) => ({ id: p.id, rotulo: `${p.numero}/${c.parcelas.length} · venceu ${dateBR(p.vencimento)}`, atualizado: calcularEncargos(Number(p.valor), p.vencimento, regras).total }));
  const proximoMes = addDias(hojeD, 30);
  const aDividir = c.parcelas.filter((p) => !p.pagoEm && !p.renegociadaEm && !p.acordoId && p.vencimento >= hojeD);
  const totalADividir = aDividir.reduce((s, p) => s + Number(p.valor), 0);

  const anexos = (
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
  );

  // Sem a permissão de ver valores: nada de dinheiro, parcelas, reajustes ou acordos — só o que é operacional.
  if (!pode(user, "valores")) {
    return (
      <main>
        <Flash erro={erro} ok={ok} />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Contrato #{c.numero}</h1>
            {pode(user, "clientes") ? <Link className="text-gold hover:underline" href={`/clientes/${c.clienteId}`}>{c.cliente.nome}</Link> : <span className="text-gold">{c.cliente.nome}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge text-gold">{STATUS_CONTRATO_LABEL[c.status]}</span>
            {edita && c.status === "ATIVO" && (
              <form action={mudarStatusContrato.bind(null, id, "ENCERRADO", undefined)}>
                <ConfirmButton className="btn btn-sm" mensagem="Encerrar este contrato?">Encerrar</ConfirmButton>
              </form>
            )}
          </div>
        </div>
        <section className="card mb-6 grid gap-4 p-4 sm:grid-cols-2">
          <div><p className="label">Período</p><p>{dateBR(c.inicio)} a {dateBR(c.fim)}</p><SeloVencimento fim={c.fim} ativo={c.status === "ATIVO"} /></div>
          <div><p className="label">Vendedor</p><p>{c.vendedor?.nome ?? "—"}</p></div>
          {c.observacoes && <p className="text-sm text-ink-soft sm:col-span-2">{c.observacoes}</p>}
        </section>
        <h2 className="mb-3 font-semibold">Pontos do contrato</h2>
        <div className="card table-wrap mb-6">
          <table className="table">
            <thead><tr><th>Ponto</th><th>Tipo</th><th>Início</th><th>Prazo</th><th>Fim</th></tr></thead>
            <tbody>
              {c.pontos.map((cp) => (
                <tr key={cp.pontoId}>
                  <td className="font-medium">{cp.ponto.nome}</td>
                  <td>{TIPO_SINGULAR[cp.ponto.tipo]}</td>
                  <td>{dateBR(cp.inicio)}</td>
                  <td>{cp.prazoMeses} meses</td>
                  <td className="whitespace-nowrap">{dateBR(cp.fim)} <SeloVencimento fim={cp.fim} ativo={c.status === "ATIVO"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {anexos}
      </main>
    );
  }

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
        <div><p className="label">Forma de pagamento</p><p>{FORMA_LABEL[c.formaPagamento]}{c.permutaDescricao && <span className="text-ink-soft"> · {c.permutaDescricao}</span>}</p></div>
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
            <tr><th>Ponto</th><th>Tipo</th><th>Valor mensal</th><th>Início</th><th>Prazo</th><th>Fim</th></tr>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edita && c.status === "ATIVO" && (
        <p className="-mt-3 mb-4 text-xs text-ink-faint">Para trocar, mudar datas ou valor, renovar ou encerrar um ponto, use <a className="text-gold hover:underline" href="#editar">Editar contrato</a> → aba <strong>Pontos</strong>.</p>
      )}

      {edita && c.status === "ATIVO" && (
        <details id="editar" className="card mb-6 p-4">
          <summary className="cursor-pointer font-semibold text-gold">✎ Editar contrato</summary>
          <p className="mt-2 text-xs text-ink-soft">Tudo o que dá para corrigir neste contrato está aqui: dados gerais, pontos (trocar, datas, valor, renovar, encerrar), parcelas, reajuste e dívida.</p>
          <AbasEdicao
            abas={[
              {
                id: "dados",
                titulo: "Dados do contrato",
                conteudo: (
                  <>
                    <form action={editarContrato.bind(null, id)} className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="label" htmlFor="formaPagamento">Forma de pagamento</label>
                                  <select className="input" id="formaPagamento" name="formaPagamento" defaultValue={c.formaPagamento}>
                                    {FORMAS_CONTRATO.map((f) => <option key={f} value={f}>{FORMA_ROTULO[f]}</option>)}
                                  </select>
                                  <p className="mt-1 text-xs text-ink-faint">Não dá para trocar entre permuta e dinheiro depois de criado.</p>
                                </div>
                                {c.formaPagamento === "PERMUTA" && (
                                  <div>
                                    <label className="label" htmlFor="permutaDescricaoEd">O que é trocado</label>
                                    <input className="input" id="permutaDescricaoEd" name="permutaDescricao" defaultValue={c.permutaDescricao ?? ""} />
                                  </div>
                                )}
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
                  </>
                ),
              },
              {
                id: "pontos",
                titulo: "Pontos",
                conteudo: (
                  <div className="space-y-3">
                    {c.pontos.map((cp) => (
                      <details key={cp.pontoId} className="card p-3">
                        <summary className="cursor-pointer text-sm font-semibold">
                          {cp.ponto.nome} <span className="font-normal text-ink-soft">· {dateBR(cp.inicio)} a {dateBR(cp.fim)} · {money(cp.valor)}{cp.ocupaTudo ? " · ponto inteiro" : cp.cotasUsadas > 1 ? ` · ${cp.cotasUsadas} cotas` : ""}</span>
                        </summary>
                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                          {cp.ponto.cotas && (
                            <form action={alterarReservaPonto.bind(null, id, cp.pontoId)} className="grid gap-2 md:col-span-2">
                              <p className="text-xs font-semibold text-gold-soft">Cotas que este contrato ocupa (o ponto tem {cp.ponto.cotas})</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <label className="text-xs text-ink-faint" htmlFor={`cotas-${cp.pontoId}`}>Número de cotas</label>
                                  <input className="input" id={`cotas-${cp.pontoId}`} name="cotasUsadas" type="number" min={1} max={cp.ponto.cotas} defaultValue={cp.cotasUsadas} />
                                </div>
                                <label className="flex items-center gap-2 text-sm sm:pt-5">
                                  <input type="checkbox" name="ocupaTudo" defaultChecked={cp.ocupaTudo} className="size-4 accent-[#d4a62a]" />
                                  Reservar o ponto inteiro (todas as cotas)
                                </label>
                              </div>
                              <p className="text-xs text-ink-faint">Ex.: triedro de 6 cotas com 3 clientes, 2 cotas cada. No outdoor anual, marque o ponto inteiro (vale mais que o número de cotas).</p>
                              <button className="btn btn-sm w-fit" type="submit">Salvar cotas</button>
                            </form>
                          )}
                          <form action={renovarPonto.bind(null, id, cp.pontoId)} className="grid gap-2">
                                                    <p className="text-xs font-semibold text-gold-soft">Renovar</p>
                                                    <input className="input" name="meses" type="number" min={1} max={120} defaultValue={12} required aria-label="Renovar por (meses)" />
                                                    <MaskedInput className="input" name="valor" mask="dinheiro" placeholder="Novo valor (opcional)" aria-label="Novo valor mensal (opcional)" />
                                                    <button className="btn btn-sm btn-gold" type="submit">Renovar por N meses</button>
                                                  </form>
                          <form action={trocarPonto.bind(null, id, cp.pontoId)} className="grid gap-2 border-t border-line pt-3">
                                                    <p className="text-xs font-semibold text-gold-soft">Trocar por outro ponto (corrigir cadastro)</p>
                                                    <select className="input" name="novoPontoId" required defaultValue="" aria-label="Ponto correto">
                                                      <option value="" disabled>Escolha o ponto correto…</option>
                                                      {disponiveis.map((p) => <option key={p.id} value={p.id}>{TIPO_SINGULAR[p.tipo]} · {p.nome}</option>)}
                                                    </select>
                                                    <ConfirmButton className="btn btn-sm" mensagem="Trocar o ponto deste contrato? Valor, datas e parcelas continuam iguais.">Trocar ponto</ConfirmButton>
                                                    <p className="text-xs text-ink-faint">Só troca o local; valor, datas e parcelas não mudam.</p>
                                                  </form>
                          <form action={alterarDatasPonto.bind(null, id, cp.pontoId)} className="grid gap-2 border-t border-line pt-3">
                                                    <p className="text-xs font-semibold text-gold-soft">Alterar datas de veiculação</p>
                                                    <label className="text-xs text-ink-faint" htmlFor={`ini-${cp.pontoId}`}>Início</label>
                                                    <input className="input" id={`ini-${cp.pontoId}`} name="inicio" type="date" defaultValue={isoDate(cp.inicio)} required />
                                                    <label className="text-xs text-ink-faint" htmlFor={`fim-${cp.pontoId}`}>Fim</label>
                                                    <input className="input" id={`fim-${cp.pontoId}`} name="fim" type="date" defaultValue={isoDate(cp.fim)} required />
                                                    <ConfirmButton className="btn btn-sm" mensagem="Alterar as datas de veiculação deste ponto? As parcelas não mudam.">Alterar datas</ConfirmButton>
                                                    <p className="text-xs text-ink-faint">Só muda o período do ponto (ocupação, vagas e avisos de fim). As parcelas continuam como estão.</p>
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
                    ))}
                    <details className="card p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-gold">+ Adicionar ponto a este contrato</summary>
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
                                        <label className="label" htmlFor="valor">Valor (R$) — mensal, ou por bi-semana</label>
                                        <MaskedInput className="input" id="valor" name="valor" mask="dinheiro" placeholder="1.500,00" required />
                                      </div>
                                      <div>
                                        <label className="label" htmlFor="inicio">Início</label>
                                        <input className="input" id="inicio" name="inicio" type="date" defaultValue={isoDate(hoje())} required />
                                      </div>
                                      <div>
                                        <label className="label" htmlFor="prazoMeses">Prazo</label>
                                        <div className="flex gap-2">
                                          <input className="input min-w-0 flex-1" id="prazoMeses" name="prazoMeses" type="number" min={1} max={260} defaultValue={12} required />
                                          <select className="input w-auto" name="unidade" defaultValue="meses" aria-label="Unidade do prazo">
                                            <option value="meses">Meses</option>
                                            <option value="bisemanas">Bi-semanas</option>
                                          </select>
                                        </div>
                                        <p className="mt-1 text-xs text-ink-faint">Bi-semana (14 dias) só para outdoor e triedro; o valor então é por bi-semana.</p>
                                      </div>
                                      <div>
                                        <label className="label" htmlFor="cotasUsadas">Cotas que ocupa</label>
                                        <input className="input" id="cotasUsadas" name="cotasUsadas" type="number" min={1} defaultValue={1} />
                                      </div>
                                      <label className="flex items-center gap-2 text-sm sm:pt-6">
                                        <input type="checkbox" name="ocupaTudo" className="size-4 accent-[#d4a62a]" />
                                        Reservar o ponto inteiro
                                      </label>
                                      <div className="flex items-end">
                                        <button className="btn btn-gold w-full sm:w-auto" type="submit">Adicionar ponto</button>
                                      </div>
                                    </form>
                      )}
                    </details>
                  </div>
                ),
              },
              {
                id: "parcelas",
                titulo: "Parcelas",
                conteudo: (
                  <div className="space-y-5">
                    {pode(user, "baixar") && c.formaPagamento !== "PERMUTA" ? (
                      <>
                        <div>
                          <p className="mb-2 text-sm font-semibold text-gold-soft">Adicionar parcela</p>
                          <form action={adicionarParcela.bind(null, id)} className="mt-3 grid gap-3 sm:grid-cols-2">
                                        <div>
                                          <label className="label" htmlFor="novaValor">Valor</label>
                                          <MaskedInput className="input" id="novaValor" name="valor" mask="dinheiro" placeholder="1.000,00" required />
                                        </div>
                                        <div>
                                          <label className="label" htmlFor="novaVenc">Vencimento</label>
                                          <input className="input" id="novaVenc" name="vencimento" type="date" required />
                                        </div>
                                        <div className="sm:col-span-2">
                                          <label className="label" htmlFor="novaObs">Motivo (opcional)</label>
                                          <input className="input" id="novaObs" name="observacoes" placeholder="Ex.: parcela extra, serviço adicional" />
                                        </div>
                                        <div className="sm:col-span-2"><button className="btn btn-gold" type="submit">Adicionar parcela</button></div>
                                      </form>
                        </div>
                        <div className="border-t border-line pt-4">
                          <p className="mb-2 text-sm font-semibold text-gold-soft">Dividir em mais (ou menos) vezes</p>
                          {aDividir.length === 0 ? (
                            <p className="text-sm text-ink-soft">Não há parcelas a vencer para dividir. Para dívidas já vencidas, use a aba <strong>Dívida</strong>.</p>
                          ) : (
                            <>
                              <form action={reparcelarContrato.bind(null, id)} className="mt-3 grid gap-3 sm:grid-cols-2">
                                              <p className="text-xs text-ink-soft sm:col-span-2">
                                                Faltam <strong className="text-gold-soft">{aDividir.length}</strong> parcela(s) a vencer, somando <strong className="text-gold-soft">{money(totalADividir)}</strong>.
                                                O total delas será dividido em parcelas iguais. Parcelas já pagas ou vencidas não mudam.
                                              </p>
                                              <div>
                                                <label className="label" htmlFor="vezes">Dividir em quantas vezes</label>
                                                <input className="input" id="vezes" name="vezes" type="number" min={1} max={60} defaultValue={aDividir.length} required />
                                              </div>
                                              <div>
                                                <label className="label" htmlFor="primeiro">1º vencimento novo</label>
                                                <input className="input" id="primeiro" name="primeiro" type="date" defaultValue={isoDate(aDividir[0].vencimento)} required />
                                              </div>
                                              <div className="sm:col-span-2">
                                                <label className="label" htmlFor="intervalo">Intervalo entre as parcelas</label>
                                                <select className="input" id="intervalo" name="intervalo" defaultValue="mensal">
                                                  <option value="mensal">Mensal (todo mês, no mesmo dia)</option>
                                                  <option value="15">A cada 15 dias</option>
                                                  <option value="7">A cada 7 dias (semanal)</option>
                                                </select>
                                              </div>
                                              <div className="sm:col-span-2">
                                                <ConfirmButton className="btn btn-gold" mensagem="Refazer o parcelamento? As parcelas a vencer serão substituídas pelas novas.">Refazer parcelamento</ConfirmButton>
                                              </div>
                                            </form>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-ink-soft">Sem permissão para alterar parcelas, ou contrato de permuta (sem parcelas).</p>
                    )}
                    {pode(user, "baixar") && c.formaPagamento !== "PERMUTA" && aDividir.length > 0 && (
                      <div className="border-t border-line pt-4">
                        <p className="mb-1 text-sm font-semibold text-gold-soft">Dividir cada parcela em vários pagamentos</p>
                        <p className="mb-2 text-xs text-ink-soft">Para o cliente que fecha a mensalidade, mas paga em partes: por exemplo, cada parcela de R$ 1.000 vira 2 pagamentos de R$ 500, a cada 15 dias. Vale para as {aDividir.length} parcela(s) que ainda vão vencer.</p>
                        <form action={dividirParcelasDoContrato.bind(null, id)} className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="label" htmlFor="partesTodas">Pagamentos por parcela</label>
                            <input className="input" id="partesTodas" name="partes" type="number" min={2} max={12} defaultValue={2} required />
                          </div>
                          <div>
                            <label className="label" htmlFor="intervaloTodas">Intervalo</label>
                            <select className="input" id="intervaloTodas" name="intervalo" defaultValue="15">
                              <option value="15">A cada 15 dias</option>
                              <option value="7">A cada 7 dias (semanal)</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <ConfirmButton className="btn btn-gold" mensagem="Dividir cada parcela a vencer em vários pagamentos? As parcelas atuais serão substituídas.">Dividir cada parcela</ConfirmButton>
                          </div>
                        </form>
                      </div>
                    )}
                    <div className="border-t border-line pt-4">
                      <form action={comecarControleEm.bind(null, id)} className="mt-5 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                                  <div className="sm:col-span-2">
                                    <p className="text-sm font-semibold text-gold-soft">Começar a controlar a partir de uma data</p>
                                    <p className="mt-1 text-xs text-ink-soft">Use para contratos que já vinham de antes: as parcelas com vencimento anterior à data saem do sistema (pagas ou não). As datas de veiculação e os pontos continuam iguais.</p>
                                  </div>
                                  <div>
                                    <label className="label" htmlFor="corte">Controlar a partir de</label>
                                    <input className="input" id="corte" name="corte" type="date" defaultValue={isoDate(new Date(Date.UTC(hoje().getUTCFullYear(), hoje().getUTCMonth(), 1)))} required />
                                  </div>
                                  <div className="flex items-end">
                                    <ConfirmButton className="btn btn-sm btn-danger" mensagem="Retirar do sistema as parcelas anteriores a essa data? Isso não pode ser desfeito.">Retirar parcelas anteriores</ConfirmButton>
                                  </div>
                                </form>
                    </div>
                    <p className="text-xs text-ink-faint">Para editar ou excluir uma parcela específica, use o botão <strong>Editar</strong> na linha dela, na lista de parcelas abaixo.</p>
                  </div>
                ),
              },
              {
                id: "reajuste",
                titulo: "Reajuste",
                conteudo: (
                  <>
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
                  </>
                ),
              },
              ...(pode(user, "baixar") && vencidas.length > 0
                ? [{
                    id: "divida",
                    titulo: `Dívida (${vencidas.length})`,
                    conteudo: (
                      <FormAcordo contratoId={id} parcelas={vencidas} hojeISO={isoDate(hoje())} mesQueVemISO={isoDate(proximoMes)} />
                    ),
                  }]
                : []),
            ]}
          />
        </details>
      )}
      {!(edita && c.status === "ATIVO") && c.reajustes.length > 0 && (
        <section className="card mb-6 p-4">
          <h2 className="mb-2 text-sm font-semibold text-gold-soft">Reajustes aplicados</h2>
          <ul className="divide-y divide-white/5 text-sm">
            {c.reajustes.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 py-2">
                <span>{dateBR(r.aplicadoEm)} · {r.indice} <strong className="text-gold-soft">{Number(r.percentual) > 0 ? "+" : ""}{Number(r.percentual).toString().replace(".", ",")}%</strong></span>
                <span className="text-xs text-ink-faint">{r.usuarioNome}</span>
              </li>
            ))}
          </ul>
        </section>
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

      <h2 className="mb-3 font-semibold">Parcelas</h2>
      {c.formaPagamento === "PERMUTA" && <p className="card mb-3 p-4 text-sm text-ink-soft">Contrato de permuta: não há parcelas a receber. O valor mensal dos pontos é só uma referência e não entra no dinheiro recebido.</p>}
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
                    pode={pode(user, "baixar")}
                  />
                  {pode(user, "baixar") && !p.pagoEm && (
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
                      <form action={dividirParcela.bind(null, p.id, volta)} className="card mt-2 grid min-w-60 gap-2 p-3">
                        <p className="text-xs font-semibold text-gold-soft">Dividir esta parcela</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input className="input" name="partes" type="number" min={2} max={12} defaultValue={2} required aria-label="Quantos pagamentos" />
                          <select className="input" name="intervalo" defaultValue="15" aria-label="Intervalo">
                            <option value="15">A cada 15 dias</option>
                            <option value="7">A cada 7 dias</option>
                          </select>
                        </div>
                        <ConfirmButton className="btn btn-sm" mensagem="Dividir esta parcela em vários pagamentos?">Dividir parcela</ConfirmButton>
                      </form>
                    </details>
                  )}
                  {pode(user, "baixar") && !p.pagoEm && !p.acordoId && (
                    <form action={excluirParcela.bind(null, p.id, volta)}>
                      <ConfirmButton className="btn btn-sm btn-danger" mensagem={`Excluir a parcela ${p.numero}/${c.parcelas.length} de ${money(p.valor)} (vence ${dateBR(p.vencimento)})? Ela deixa de ser cobrada e as demais são renumeradas.`}>Excluir</ConfirmButton>
                    </form>
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


      {anexos}
    </main>
  );
}
