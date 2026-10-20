import Link from "next/link";
import { CalendarClock, Percent, Wrench, CircleDollarSign, FileText, Gauge, Receipt, TriangleAlert, TrendingDown, TrendingUp } from "lucide-react";
import Flash from "@/components/Flash";
import FluxoMensal from "@/components/FluxoMensal";
import { pode, requireUser } from "@/lib/auth";
import { alertas, fluxoMensal, resumoFinanceiro } from "@/lib/financeiro";
import { chaveDoMes } from "@/lib/indicadores";
import { prisma } from "@/lib/prisma";
import { dateBR, diasEntre, hoje, money } from "@/lib/format";

export const dynamic = "force-dynamic";

type Tom = "ouro" | "perigo" | "bom";
const COR: Record<Tom, string> = { ouro: "text-grad", perigo: "text-danger", bom: "text-good" };

function Kpi({ i, icone: Icone, label, value, sub, tom = "ouro" }: {
  i: number;
  icone: typeof Gauge;
  label: string;
  value: string;
  sub?: string;
  tom?: Tom;
}) {
  return (
    <div className="card rise p-5" style={{ ["--i" as string]: i }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="label !mb-0">{label}</p>
        <span className="grid size-8 place-items-center rounded-lg bg-gold/10 text-gold">
          <Icone className="size-4" />
        </span>
      </div>
      <p className={`font-display text-[clamp(1rem,4.7vw,1.65rem)] font-bold leading-none tracking-tight whitespace-nowrap ${COR[tom]}`}>{value}</p>
      {sub && <p className="mt-2 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

function Lista({ i, titulo, icone: Icone, cor, vazio, children }: {
  i: number;
  titulo: string;
  icone: typeof Gauge;
  cor: string;
  vazio: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="card rise p-5" style={{ ["--i" as string]: i }}>
      <h2 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${cor}`}>
        <Icone className="size-4" /> {titulo}
      </h2>
      {children.length === 0 ? (
        <p className="text-sm text-ink-soft">{vazio}</p>
      ) : (
        <ul className="divide-y divide-white/5 text-sm">{children}</ul>
      )}
    </section>
  );
}

export default async function Painel({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [user, { erro, ok }] = await Promise.all([requireUser(), searchParams]);
  const [r, a, fluxo, meta] = await Promise.all([resumoFinanceiro(), alertas(), fluxoMensal(), prisma.meta.findUnique({ where: { mes: chaveDoMes(hoje()) } })]);
  const h = hoje();
  const vReceber = pode(user, "receber");
  const vDespesas = pode(user, "despesas");
  const vMetas = pode(user, "metas");
  const vCarteira = pode(user, "carteira");
  const vPontos = pode(user, "pontos");
  const vManut = pode(user, "manutencao");
  const nKpis = [vReceber, vReceber, vDespesas, vDespesas && vReceber, vCarteira, vPontos].filter(Boolean).length;
  const colunas = nKpis >= 5 || nKpis === 3 ? "lg:grid-cols-3" : nKpis === 4 ? "lg:grid-cols-4" : "lg:grid-cols-2";
  const resultado = r.recebidoMes - r.despesasPagasMes;
  const ocupacao = r.pontosTotal ? Math.round((r.pontosOcupados / r.pontosTotal) * 100) : 0;
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <main>
      <Flash erro={erro} ok={ok} />
      <header className="rise mb-7">
        <p className="label">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "America/Sao_Paulo" }).format(new Date())}</p>
        <h1>
          {saudacao}, <span className="text-grad">{user.nome.split(" ")[0]}</span>
        </h1>
      </header>

      {nKpis === 0 && !vManut && !vCarteira && <p className="card p-5 text-sm text-ink-soft">Use o menu para acessar as áreas liberadas para você.</p>}

      <section className={`grid grid-cols-2 gap-3 lg:gap-4 ${colunas}`}>
        {vReceber && <Kpi i={1} icone={TriangleAlert} label="Inadimplência" value={money(r.inadimplencia)} sub={r.inadimplenciaAtualizada > r.inadimplencia ? `${r.parcelasEmAtraso} parcela(s) · com encargos ${money(r.inadimplenciaAtualizada)}` : `${r.parcelasEmAtraso} parcela(s) em atraso`} tom={r.inadimplencia > 0 ? "perigo" : "bom"} />}
        {vReceber && <Kpi i={2} icone={CircleDollarSign} label="Recebido no mês" value={money(r.recebidoMes)} sub={`Previsto: ${money(r.previstoMes)}`} />}
        {vDespesas && <Kpi i={3} icone={Receipt} label="Despesas pagas no mês" value={money(r.despesasPagasMes)} sub={`A pagar até o fim do mês: ${money(r.despesasAPagar)}`} tom="perigo" />}
        {vDespesas && vReceber && <Kpi i={4} icone={resultado >= 0 ? TrendingUp : TrendingDown} label="Resultado do mês" value={money(resultado)} sub="Recebido − despesas pagas" tom={resultado >= 0 ? "bom" : "perigo"} />}
        {vCarteira && <Kpi i={5} icone={FileText} label="Contratos ativos" value={String(r.contratosAtivos)} />}
        {vPontos && <Kpi i={6} icone={Gauge} label="Pontos com clientes" value={`${ocupacao}%`} sub={`${r.pontosOcupados} de ${r.pontosTotal} com contrato ativo`} />}
      </section>

      {vMetas && meta && (
        <Link href="/indicadores" className="card rise mt-4 block p-5 lg:mt-5" style={{ ["--i" as string]: 5 }}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-gold-soft">Meta do mês</span>
            <span className="text-xs text-ink-soft">{money(r.recebidoMes)} de {money(meta.valor)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${r.recebidoMes >= Number(meta.valor) ? "bg-good" : "bg-gradient-to-r from-gold-deep to-gold-soft"}`} style={{ width: `${Math.min(100, (r.recebidoMes / Number(meta.valor)) * 100)}%` }} />
          </div>
        </Link>
      )}

{vReceber && (
      <section className="card rise mt-4 p-5 lg:mt-5 lg:p-6" style={{ ["--i" as string]: 5 }}>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gold-soft">
          <TrendingUp className="size-4" /> Recebido x previsto por mês
        </h2>
        <FluxoMensal meses={fluxo} />
      </section>
)}

      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-2 lg:gap-5">
{vReceber && (
        <Lista i={6} titulo="Em atraso" icone={TriangleAlert} cor="text-danger" vazio="Nenhuma parcela em atraso.">
          {a.atrasadas.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <Link href={`/contratos/${p.contratoId}`} className="min-w-0 transition-colors hover:text-gold-soft">
                <span className="block truncate font-medium">{p.contrato.cliente.nome}</span>
                <span className="text-xs text-ink-soft">
                  Parcela {p.numero} · venceu {dateBR(p.vencimento)} ({diasEntre(p.vencimento, h)} dias)
                </span>
              </Link>
              <span className="shrink-0 font-semibold tabular-nums">{money(p.valor)}</span>
            </li>
          ))}
        </Lista>
)}

{vReceber && (
        <Lista i={7} titulo="Vencem nos próximos 7 dias" icone={CalendarClock} cor="text-warn" vazio="Nada vencendo esta semana.">
          {a.aVencer.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <Link href={`/contratos/${p.contratoId}`} className="min-w-0 transition-colors hover:text-gold-soft">
                <span className="block truncate font-medium">{p.contrato.cliente.nome}</span>
                <span className="text-xs text-ink-soft">Parcela {p.numero} · vence {dateBR(p.vencimento)}</span>
              </Link>
              <span className="shrink-0 font-semibold tabular-nums">{money(p.valor)}</span>
            </li>
          ))}
        </Lista>
)}

        {vDespesas && (
          <div className="lg:col-span-2">
            <Lista i={8} titulo="Despesas vencidas ou vencendo em 7 dias" icone={Receipt} cor="text-warn" vazio="Nenhuma despesa pendente.">
              {a.despesas.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href="/despesas?f=atraso" className="min-w-0 transition-colors hover:text-gold-soft">
                    <span className="block truncate font-medium">{d.descricao}</span>
                    <span className="text-xs text-ink-soft">
                      {d.vencimento < h ? `venceu ${dateBR(d.vencimento)} (${diasEntre(d.vencimento, h)} dias)` : `vence ${dateBR(d.vencimento)}`}
                    </span>
                  </Link>
                  <span className="shrink-0 font-semibold tabular-nums">{money(d.valor)}</span>
                </li>
              ))}
            </Lista>
          </div>
        )}

{vManut && (
        <div className="lg:col-span-2">
          <Lista i={9} titulo="Manutenção em aberto" icone={Wrench} cor="text-warn" vazio="Nenhuma ocorrência aberta.">
            {a.ocorrencias.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/ocorrencias/${o.id}`} className="min-w-0 transition-colors hover:text-gold-soft">
                  <span className="block truncate font-medium">{o.titulo}</span>
                  <span className="text-xs text-ink-soft">{o.ponto.nome} · aberta em {dateBR(o.abertaEm)} ({diasEntre(o.abertaEm, h)} dias)</span>
                </Link>
                <span className={`badge ${o.status === "ABERTA" ? "text-danger" : "text-warn"}`}>{o.status === "ABERTA" ? "Aberta" : "Em andamento"}</span>
              </li>
            ))}
          </Lista>
        </div>
)}

{vCarteira && pode(user, "valores") && (
        <div className="lg:col-span-2">
          <Lista i={9} titulo="Reajuste anual a aplicar (próximos 30 dias)" icone={Percent} cor="text-gold-soft" vazio="Nenhum contrato com reajuste próximo.">
            {a.reajustes.map(({ c, devidoEm }) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/contratos/${c.id}`} className="min-w-0 transition-colors hover:text-gold-soft">
                  <span className="block truncate font-medium">{c.cliente.nome} · contrato #{c.numero}</span>
                  <span className="text-xs text-ink-soft">{devidoEm < h ? `atrasado desde ${dateBR(devidoEm)}` : `devido em ${dateBR(devidoEm)}`}</span>
                </Link>
              </li>
            ))}
          </Lista>
        </div>
)}

{vCarteira && (
        <div className="lg:col-span-2">
          <Lista i={10} titulo="Pontos com prazo terminando em até 60 dias" icone={CalendarClock} cor="text-gold-soft" vazio="Nenhum ponto perto do fim do prazo.">
            {a.terminando.map((c) => (
              <li key={`${c.contratoId}-${c.pontoId}`} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/contratos/${c.contratoId}`} className="min-w-0 transition-colors hover:text-gold-soft">
                  <span className="block truncate font-medium">{c.contrato.cliente.nome}</span>
                  <span className="text-xs text-ink-soft">{c.ponto.nome}</span>
                </Link>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold tabular-nums">{dateBR(c.fim)}</span>
                  <span className="text-xs text-ink-soft">em {diasEntre(h, c.fim)} dias</span>
                </span>
              </li>
            ))}
          </Lista>
        </div>
)}
      </div>
    </main>
  );
}
