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
export default function OcupacaoPainel({ dados, verContratos }: { dados: Dados; verContratos: boolean }) {
  const { geral, porTipo, clientesPagantes, clientesPermuta, permutas } = dados;
  const ocupadas = geral.clientes + geral.permuta;
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
        <div className="card rise p-5 lg:col-span-2 lg:p-6" style={{ ["--i" as string]: 6 }}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-soft"><Repeat className="size-4" /> Clientes e permutas</h2>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-3">
              <p className="font-display text-2xl font-bold text-gold-soft">{clientesPagantes}</p>
              <p className="text-xs text-ink-soft">cliente(s) que pagam</p>
            </div>
            <div className="rounded-xl border border-good/30 bg-good/10 p-3">
              <p className="font-display text-2xl font-bold text-good">{clientesPermuta}</p>
              <p className="text-xs text-ink-soft">cliente(s) em permuta</p>
            </div>
          </div>
          {permutas.length === 0 ? (
            <p className="text-sm text-ink-soft">Nenhuma permuta ativa hoje.</p>
          ) : (
            <ul className="divide-y divide-white/5 text-sm">
              {permutas.map((p, i) => (
                <li key={`${p.contratoId}-${i}`} className="py-2">
                  <Link href={`/contratos/${p.contratoId}`} className="font-medium hover:text-gold-soft">{p.cliente}</Link>
                  <span className="block text-xs text-ink-soft">{p.ponto} · {TIPO_LABEL[p.tipo]} · até {dateBR(p.fim)}</span>
                  {p.descricao && <span className="block text-xs text-ink-faint">Troca: {p.descricao}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
