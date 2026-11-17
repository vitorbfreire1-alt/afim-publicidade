import Link from "next/link";
import { Repeat } from "lucide-react";
import type { ocupacaoDoDia } from "@/lib/ocupacao";
import { TIPO_LABEL } from "@/lib/labels";
import { dateBR } from "@/lib/format";

type Dados = Awaited<ReturnType<typeof ocupacaoDoDia>>;

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

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

/** Painel: taxa de ocupação (geral e por tipo de mídia) e a separação entre clientes que pagam e permutas. */
export default function OcupacaoPainel({ dados, verContratos, lista }: { dados: Dados; verContratos: boolean; lista: "pagam" | "permuta" | null }) {
  const { geral, porTipo, clientesPagantes, clientesPermuta } = dados;
  const mostrados = lista === "pagam" ? clientesPagantes : lista === "permuta" ? clientesPermuta : [];
  const ocupadas = geral.clientes + geral.permuta;
  // Quanto cada grupo representa das cotas ocupadas (os dois somam 100%) e da capacidade total.
  const partePagam = ocupadas > 0 ? Math.round((geral.clientes / ocupadas) * 100) : 0;
  const partePermuta = ocupadas > 0 ? 100 - partePagam : 0;
  return (
    <section className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-5">
      <div className="card rise p-5 lg:col-span-3 lg:p-6" style={{ ["--i" as string]: 5 }}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label !mb-1">Taxa de ocupação (hoje)</p>
            <p className="font-display text-4xl font-bold leading-none text-grad">{pct(ocupadas, geral.capacidade)}%</p>
            <p className="mt-1 text-xs text-ink-soft">{num(ocupadas)} de {num(geral.capacidade)} cotas · {geral.pontosOcupados} de {geral.pontos} pontos com contrato</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-gold" /> Clientes (pagam) · {num(geral.clientes)}</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-good/80" /> Permuta · {num(geral.permuta)}</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-white/15" /> Livre · {num(Math.max(0, geral.capacidade - ocupadas))}</span>
          </div>
        </div>
        <Barra clientes={geral.clientes} permuta={geral.permuta} capacidade={geral.capacidade} alto="h-3.5" />

        <ul className="mt-5 space-y-4">
          {porTipo.map((l) => {
            const oc = l.clientes + l.permuta;
            return (
              <li key={l.tipo}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{TIPO_LABEL[l.tipo]}</span>
                  <span className="text-xs text-ink-soft">
                    <strong className="text-base text-gold-soft">{pct(oc, l.capacidade)}%</strong> · {num(oc)}/{num(l.capacidade)} cotas · {l.pontosOcupados}/{l.pontos} pontos
                  </span>
                </div>
                <Barra clientes={l.clientes} permuta={l.permuta} capacidade={l.capacidade} />
                {l.permuta > 0 && <p className="mt-1 text-xs text-ink-faint">{num(l.clientes)} de clientes · {num(l.permuta)} de permuta</p>}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-ink-faint">Cada cota ocupada conta uma vez. Ponto sem limite de cotas conta como uma cota.</p>
      </div>

      {verContratos && (
        <div id="clientes-permutas" className="card rise p-5 lg:col-span-2 lg:p-6" style={{ ["--i" as string]: 6 }}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-soft"><Repeat className="size-4" /> Clientes e permutas</h2>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Link
              href={lista === "pagam" ? "/#clientes-permutas" : "/?lista=pagam#clientes-permutas"}
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
              href={lista === "permuta" ? "/#clientes-permutas" : "/?lista=permuta#clientes-permutas"}
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
                <Link href="/#clientes-permutas" scroll={false} className="text-gold hover:underline">Limpar filtro</Link>
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
