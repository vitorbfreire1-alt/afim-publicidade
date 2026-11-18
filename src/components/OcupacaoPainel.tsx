import Link from "next/link";
import { Repeat } from "lucide-react";
import { percentuais, type OcupacaoEm } from "@/lib/ocupacao";
import { TIPO_LABEL } from "@/lib/labels";
import { dateBR } from "@/lib/format";

export interface MesPrevisao {
  /** AAAA-MM */
  chave: string;
  rotulo: string;
  atual: boolean;
  clientes: number;
  permuta: number;
  livre: number;
}

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

/** Endereço do Painel com o mês e a lista escolhidos (o mês atual é o padrão e não vai na URL). */
function href(mes: string | null, lista: string | null, ancora: string) {
  const q = new URLSearchParams();
  if (mes) q.set("mes", mes);
  if (lista) q.set("lista", lista);
  const s = q.toString();
  return `/${s ? `?${s}` : ""}#${ancora}`;
}

function Barra({ clientes, permuta, capacidade, alto = "h-2.5" }: { clientes: number; permuta: number; capacidade: number; alto?: string }) {
  const c = capacidade ? (clientes / capacidade) * 100 : 0;
  const p = capacidade ? (permuta / capacidade) * 100 : 0;
  return (
    <div className={`flex ${alto} overflow-hidden rounded-full bg-white/10`} role="img" aria-label={`${Math.round(c)}% clientes e ${Math.round(p)}% permuta`}>
      <div className="h-full bg-gradient-to-r from-gold-deep to-gold-soft" style={{ width: `${c}%` }} />
      <div className="h-full bg-good/80" style={{ width: `${p}%` }} />
    </div>
  );
}

function Numero({ rotulo, valor, sub, cor }: { rotulo: string; valor: string; sub?: string; cor: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">{rotulo}</p>
      <p className={`font-display text-2xl font-bold leading-tight ${cor}`}>{valor}</p>
      {sub && <p className="text-[0.7rem] text-ink-faint">{sub}</p>}
    </div>
  );
}

/** Painel: ocupação, ociosidade e permuta (hoje ou num mês futuro), previsão por mês e clientes que pagam × permutas. */
export default function OcupacaoPainel({ dados, previsao, mesSelecionado, verContratos, lista }: {
  dados: OcupacaoEm;
  previsao: MesPrevisao[];
  mesSelecionado: string | null;
  verContratos: boolean;
  lista: "pagam" | "permuta" | null;
}) {
  const { geral, porTipo, clientesPagantes, clientesPermuta } = dados;
  const g = percentuais(geral);
  const ocupadas = geral.clientes + geral.permuta;
  const futuro = mesSelecionado !== null;
  // Quanto cada grupo representa das cotas ocupadas (os dois somam 100%).
  const partePagam = ocupadas > 0 ? Math.round((geral.clientes / ocupadas) * 100) : 0;
  const partePermuta = ocupadas > 0 ? 100 - partePagam : 0;
  const mostrados = lista === "pagam" ? clientesPagantes : lista === "permuta" ? clientesPermuta : [];
  return (
    <section id="ocupacao" className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-5">
      <div className="card rise min-w-0 p-5 lg:col-span-3 lg:p-6" style={{ ["--i" as string]: 5 }}>
        <div className="mb-4">
          <p className="label !mb-1">Ocupação e ociosidade · {futuro ? `previsão para ${dateBR(dados.referencia)}` : "hoje"}</p>
          <p className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold leading-none text-grad">{g.ocupada}%</span>
            <span className="text-sm text-ink-soft">das cotas ocupadas</span>
          </p>
          <p className="mt-1 text-xs text-ink-soft">{num(ocupadas)} de {num(geral.capacidade)} cotas · {geral.pontosOcupados} de {geral.pontos} pontos com contrato</p>
          {futuro && <p className="mt-1 text-xs text-warn">Considera só os contratos já cadastrados; renovações e contratos novos ainda não lançados não entram.</p>}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Numero rotulo="Pagando" valor={`${g.clientes}%`} sub={`${num(geral.clientes)} cota(s)`} cor="text-gold-soft" />
          <Numero rotulo="Permuta" valor={`${g.permuta}%`} sub={`${num(geral.permuta)} cota(s)`} cor="text-good" />
          <Numero rotulo="Ociosa (livre)" valor={`${g.livre}%`} sub={`${num(Math.max(0, geral.capacidade - ocupadas))} cota(s)`} cor="text-ink" />
          <Numero rotulo="Poderia estar pagando" valor={`${g.potencial}%`} sub="livre + permuta" cor="text-warn" />
        </div>
        <div className="mt-4">
          <Barra clientes={geral.clientes} permuta={geral.permuta} capacidade={geral.capacidade} alto="h-3.5" />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-gold" /> Pagando</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-good/80" /> Permuta</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-white/15" /> Livre</span>
          </div>
        </div>

        <ul className="mt-5 space-y-4">
          {porTipo.map((l) => {
            const p = percentuais(l);
            const oc = l.clientes + l.permuta;
            return (
              <li key={l.tipo}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="font-medium">{TIPO_LABEL[l.tipo]}</span>
                  <span className="text-xs text-ink-soft">
                    <strong className="text-base text-gold-soft">{p.ocupada}%</strong> ocupada · {num(oc)}/{num(l.capacidade)} cotas · {l.pontosOcupados}/{l.pontos} pontos
                  </span>
                </div>
                <Barra clientes={l.clientes} permuta={l.permuta} capacidade={l.capacidade} />
                <p className="mt-1 text-xs text-ink-faint">pagando {p.clientes}% · permuta {p.permuta}% · ociosa {p.livre}% · poderia estar pagando <span className="text-warn">{p.potencial}%</span></p>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-gold-soft">Previsão por mês</p>
            <p className="text-xs text-ink-faint">Toque em um mês para ver os números dele.</p>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Mês da previsão">
            {previsao.map((m) => {
              const selecionado = m.atual ? !futuro : m.chave === mesSelecionado;
              const alto = 56;
              return (
                <Link
                  key={m.chave}
                  href={href(m.atual ? null : m.chave, lista, "ocupacao")}
                  scroll={false}
                  role="tab"
                  aria-selected={selecionado}
                  className={`flex w-14 shrink-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition hover:brightness-125 ${selecionado ? "border-gold bg-gold/15 ring-1 ring-gold" : "border-white/10 bg-white/[0.03]"}`}
                >
                  <span className="flex w-5 flex-col-reverse overflow-hidden rounded-full bg-white/10" style={{ height: alto }}>
                    <span className="block bg-gradient-to-t from-gold-deep to-gold-soft" style={{ height: `${(m.clientes / 100) * alto}px` }} />
                    <span className="block bg-good/80" style={{ height: `${(m.permuta / 100) * alto}px` }} />
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-ink">{m.clientes + m.permuta}%</span>
                  <span className="text-[0.68rem] text-ink-faint">{m.atual ? "hoje" : m.rotulo}</span>
                </Link>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-faint">Cada coluna é a ocupação (pagando + permuta). Para meses futuros vale o 1º dia do mês.</p>
        </div>
        <p className="mt-3 text-xs text-ink-faint">Cada cota ocupada conta uma vez. Ponto sem limite de cotas conta como uma cota.</p>
      </div>

      {verContratos && (
        <div id="clientes-permutas" className="card rise min-w-0 p-5 lg:col-span-2 lg:p-6" style={{ ["--i" as string]: 6 }}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-soft"><Repeat className="size-4" /> Clientes e permutas</h2>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Link
              href={href(mesSelecionado, lista === "pagam" ? null : "pagam", "clientes-permutas")}
              scroll={false}
              aria-pressed={lista === "pagam"}
              className={`rounded-xl border p-3 transition hover:brightness-125 ${lista === "pagam" ? "border-gold bg-gold/20 ring-1 ring-gold" : "border-gold/30 bg-gold/10"}`}
            >
              <p className="font-display text-2xl font-bold text-gold-soft">{clientesPagantes.length}</p>
              <p className="text-xs text-ink-soft">cliente(s) que pagam</p>
              <p className="mt-1.5 text-xs font-semibold text-gold-soft">{partePagam}% das ocupações</p>
              <p className="text-[0.7rem] text-ink-faint">{pct(geral.clientes, geral.capacidade)}% da capacidade total</p>
            </Link>
            <Link
              href={href(mesSelecionado, lista === "permuta" ? null : "permuta", "clientes-permutas")}
              scroll={false}
              aria-pressed={lista === "permuta"}
              className={`rounded-xl border p-3 transition hover:brightness-125 ${lista === "permuta" ? "border-good bg-good/20 ring-1 ring-good" : "border-good/30 bg-good/10"}`}
            >
              <p className="font-display text-2xl font-bold text-good">{clientesPermuta.length}</p>
              <p className="text-xs text-ink-soft">cliente(s) em permuta</p>
              <p className="mt-1.5 text-xs font-semibold text-good">{partePermuta}% das ocupações</p>
              <p className="text-[0.7rem] text-ink-faint">{pct(geral.permuta, geral.capacidade)}% da capacidade total</p>
            </Link>
          </div>
          {lista === null ? (
            <p className="text-sm text-ink-soft">Toque em um dos quadros acima para ver a lista de clientes que pagam ou de permutas.</p>
          ) : (
            <>
              <p className="mb-2 flex items-center justify-between text-xs text-ink-faint">
                <span>{lista === "pagam" ? "Clientes que pagam" : "Clientes em permuta"} · {mostrados.length}</span>
                <Link href={href(mesSelecionado, null, "clientes-permutas")} scroll={false} className="text-gold hover:underline">Limpar filtro</Link>
              </p>
              {mostrados.length === 0 ? (
                <p className="text-sm text-ink-soft">{lista === "pagam" ? "Nenhum cliente com contrato pago ativo hoje." : "Nenhuma permuta ativa hoje."}</p>
              ) : (
                <ul className="max-h-96 divide-y divide-white/5 overflow-y-auto pr-1 text-sm">
                  {mostrados.map((c) => (
                    <li key={c.clienteId} className="py-2">
                      <Link href={`/contratos/${c.contratoId}`} className="font-medium hover:text-gold-soft">{c.cliente}</Link>
                      <span className="block text-xs text-ink-soft">
                        {c.pontos.length} ponto(s){c.contratos > 1 && ` · ${c.contratos} contratos`} · até {dateBR(c.fim)}
                      </span>
                      <span className="block text-xs text-ink-faint">{c.pontos.slice(0, 4).map((p) => p.nome).join(", ")}{c.pontos.length > 4 && ` e mais ${c.pontos.length - 4}`}</span>
                      {lista === "permuta" && c.descricao && <span className="block text-xs text-ink-faint">Troca: {c.descricao}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
