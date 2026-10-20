import Link from "next/link";
import Flash from "@/components/Flash";
import MaskedInput from "@/components/MaskedInput";
import MrrChart from "@/components/MrrChart";
import { definirMeta } from "@/app/actions/metas";
import { requireUser } from "@/lib/auth";
import { resumoFinanceiro } from "@/lib/financeiro";
import { hoje, money } from "@/lib/format";
import { TIPO_LABEL } from "@/lib/labels";
import { calcularIndicadores, chaveDoMes } from "@/lib/indicadores";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Metas e indicadores" };

const pct = (n: number) => `${n.toString().replace(".", ",")}%`;

export default async function Indicadores({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [user, sp] = await Promise.all([requireUser("metas"), searchParams]);
  const mes = chaveDoMes(hoje());
  const [ind, resumo, meta] = await Promise.all([calcularIndicadores(), resumoFinanceiro(), prisma.meta.findUnique({ where: { mes } })]);
  const alvo = meta ? Number(meta.valor) : 0;
  const progresso = alvo ? Math.min(100, (resumo.recebidoMes / alvo) * 100) : 0;
  const projetado = resumo.recebidoMes + Math.max(0, resumo.previstoMes - resumo.recebidoMes);
  const [ano, m] = mes.split("-");

  return (
    <main className="space-y-5">
      <Flash erro={sp.erro} ok={sp.ok} />
      <h1>Metas e indicadores</h1>

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gold-soft">Meta de faturamento de {m}/{ano}</h2>
          {alvo > 0 && <span className="text-xs text-ink-soft">{pct(Math.round(progresso))} da meta</span>}
        </div>
        {alvo > 0 ? (
          <>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full ${progresso >= 100 ? "bg-good" : "bg-gradient-to-r from-gold-deep to-gold-soft"}`} style={{ width: `${progresso}%` }} />
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <p><span className="label !mb-0">Recebido</span><strong className="text-grad">{money(resumo.recebidoMes)}</strong></p>
              <p><span className="label !mb-0">Meta</span><strong>{money(alvo)}</strong></p>
              <p><span className="label !mb-0">{resumo.recebidoMes >= alvo ? "Superou em" : "Faltam"}</span><strong className={resumo.recebidoMes >= alvo ? "text-good" : "text-warn"}>{money(Math.abs(alvo - resumo.recebidoMes))}</strong></p>
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              Se tudo que vence este mês for pago, o mês fecha em {money(projetado)} ({projetado >= alvo ? "bate a meta" : `${money(alvo - projetado)} abaixo da meta`}).
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-soft">Nenhuma meta definida para este mês.</p>
        )}
        {user.papel === "DONO" && (
          <form action={definirMeta} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="mes" value={mes} />
            <div className="min-w-48">
              <label className="label" htmlFor="valorMeta">{alvo > 0 ? "Alterar meta (R$)" : "Definir meta (R$)"}</label>
              <MaskedInput className="input" id="valorMeta" name="valor" mask="dinheiro" placeholder="50.000,00" defaultValue={alvo ? alvo.toFixed(2).replace(".", ",") : ""} />
            </div>
            <button className="btn btn-gold" type="submit">Salvar meta</button>
            <p className="basis-full text-xs text-ink-faint">Deixe em branco e salve para remover a meta.</p>
          </form>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4"><p className="label">Receita recorrente (MRR)</p><p className="font-display text-xl font-bold text-grad">{money(ind.mrr)}</p><p className="mt-1 text-xs text-ink-soft">por mês, hoje</p></div>
        <div className="card p-4"><p className="label">Projeção anual</p><p className="font-display text-xl font-bold text-grad">{money(ind.arr)}</p><p className="mt-1 text-xs text-ink-soft">MRR × 12</p></div>
        <div className="card p-4"><p className="label">Ticket médio</p><p className="font-display text-xl font-bold">{money(ind.ticketMedio)}</p><p className="mt-1 text-xs text-ink-soft">{ind.clientesAtivos} cliente(s) ativo(s)</p></div>
        <div className="card p-4"><p className="label">Taxa de inadimplência</p><p className={`font-display text-xl font-bold ${ind.taxaInadimplencia ? "text-danger" : "text-good"}`}>{ind.taxaInadimplencia == null ? "—" : pct(ind.taxaInadimplencia)}</p><p className="mt-1 text-xs text-ink-soft">do vencido em 12 meses</p></div>
      </section>
      {ind.permuta.contratos > 0 && (
        <p className="card p-4 text-sm text-ink-soft">
          <strong className="text-gold-soft">Permuta:</strong> {ind.permuta.contratos} contrato(s) ativo(s) por troca, ocupando espaço sem receber em dinheiro. Valor de referência: {money(ind.permuta.valorReferencia)} por mês (fora da receita acima).
        </p>
      )}

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-gold-soft">Evolução da receita recorrente (12 meses)</h2>
        <MrrChart meses={ind.mrrPorMes} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-warn">Receita em risco (prazo acaba em 90 dias)</h2>
          <p className="font-display text-xl font-bold">{money(ind.receitaEmRisco)}<span className="text-sm font-normal text-ink-soft"> /mês · {ind.contratosEmRisco} contrato(s)</span></p>
          <p className="mt-1 text-xs text-ink-faint">Renove antes do fim para não perder essa receita. Veja os prazos no painel.</p>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gold-soft">Funil de propostas</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <p><span className="label !mb-0">Em aberto</span><strong>{ind.funil.abertas}</strong> · {money(ind.funil.valorAberto)}/mês</p>
            <p><span className="label !mb-0">Conversão (6 meses)</span><strong className="text-good">{ind.funil.conversao == null ? "—" : `${ind.funil.conversao}%`}</strong> <span className="text-xs text-ink-soft">({ind.funil.fechadas} fechadas · {ind.funil.perdidas} perdidas)</span></p>
          </div>
          <Link className="mt-2 inline-block text-xs text-gold hover:underline" href="/propostas">Ver propostas</Link>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gold-soft">Ocupação por tipo de mídia</h2>
          <ul className="space-y-3 text-sm">
            {ind.ocupacaoPorTipo.map((o) => (
              <li key={o.tipo}>
                <div className="flex justify-between"><span>{TIPO_LABEL[o.tipo as keyof typeof TIPO_LABEL]}</span><span className="tabular-nums text-ink-soft">{o.comClientes}/{o.pontos} pontos{o.cotasTotal > 0 && ` · ${o.cotasUsadas}/${o.cotasTotal} cotas`}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gold" style={{ width: `${o.pontos ? (o.comClientes / o.pontos) * 100 : 0}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gold-soft">Ranking de vendedores (receita recorrente)</h2>
          {ind.vendedores.length === 0 ? <p className="text-sm text-ink-soft">Sem contratos ativos.</p> : (
            <ul className="divide-y divide-white/5 text-sm">
              {ind.vendedores.map((v, i) => (
                <li key={v.nome} className="flex items-center justify-between gap-3 py-2">
                  <span><span className="mr-2 text-ink-faint">{i + 1}.</span>{v.nome} <span className="text-xs text-ink-faint">· {v.contratos} contrato(s)</span></span>
                  <span className="font-semibold tabular-nums">{money(v.mrr)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gold-soft">Quanto cada metro quadrado rende (por mês)</h2>
          {ind.porM2.length === 0 ? <p className="text-sm text-ink-soft">Preencha largura e altura na ficha dos pontos para ver este indicador.</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Ponto</th><th>Área</th><th>Receita mensal</th><th>Por m²</th></tr></thead>
                <tbody>
                  {ind.porM2.map((p) => (
                    <tr key={p.id}><td><Link className="font-medium hover:text-gold-soft" href={`/pontos/${p.id}`}>{p.nome}</Link></td><td>{p.area.toFixed(1).replace(".", ",")} m²</td><td>{money(p.mrr)}</td><td className="font-semibold text-grad">{money(p.porM2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
