import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Flash from "@/components/Flash";
import ConfirmButton from "@/components/ConfirmButton";
import { lancarComissao } from "@/app/actions/comissoes";
import { podeReceber, requireUser } from "@/lib/auth";
import { comissoesDoMes, mesValido } from "@/lib/comissoes";
import { hoje, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comissões" };

const chaveMes = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const deslocar = (mes: string, n: number) => {
  const [a, m] = mes.split("-").map(Number);
  return chaveMes(new Date(Date.UTC(a, m - 1 + n, 1)));
};

export default async function Comissoes({ searchParams }: { searchParams: Promise<{ mes?: string; erro?: string; ok?: string }> }) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const mes = mesValido(sp.mes) ?? chaveMes(hoje());
  // Quem não é do financeiro vê só as próprias comissões.
  const proprio = podeReceber(user.papel) ? undefined : user.id;
  const [vendedores, fechamentos] = await Promise.all([
    comissoesDoMes(mes, proprio),
    prisma.comissaoFechamento.findMany({ where: { mes } }),
  ]);
  const fechado = new Map(fechamentos.map((f) => [f.vendedorId, f]));
  const [ano, m] = mes.split("-");
  const total = vendedores.reduce((s, v) => s + v.total, 0);

  return (
    <main>
      <Flash erro={sp.erro} ok={sp.ok} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1>Comissões</h1>
        <div className="flex items-center gap-2">
          <Link className="btn btn-sm" href={`/comissoes?mes=${deslocar(mes, -1)}`} aria-label="Mês anterior"><ChevronLeft className="size-4" /></Link>
          <span className="min-w-20 text-center font-display font-semibold">{m}/{ano}</span>
          <Link className="btn btn-sm" href={`/comissoes?mes=${deslocar(mes, 1)}`} aria-label="Próximo mês"><ChevronRight className="size-4" /></Link>
        </div>
      </div>
      <p className="mb-4 text-sm text-ink-soft">
        Comissão = percentual do contrato sobre o que o cliente <strong>efetivamente pagou</strong> no mês. Defina o vendedor e o percentual ao criar o contrato.
      </p>

      {vendedores.length === 0 ? (
        <p className="card p-5 text-sm text-ink-soft">Nenhuma comissão neste mês.</p>
      ) : (
        <div className="space-y-4">
          {vendedores.map((v) => {
            const f = fechado.get(v.vendedorId);
            return (
              <section key={v.vendedorId} className="card p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">{v.vendedor}</h2>
                    <p className="text-xs text-ink-soft">Base recebida: {money(v.base)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl font-bold text-grad">{money(v.total)}</span>
                    {f ? (
                      <span className="badge text-good">Lançada</span>
                    ) : (
                      podeReceber(user.papel) && (
                        <form action={lancarComissao.bind(null, v.vendedorId, mes)}>
                          <ConfirmButton className="btn btn-sm btn-gold" mensagem={`Lançar ${money(v.total)} de comissão de ${v.vendedor} como despesa a pagar?`}>
                            Lançar como despesa
                          </ConfirmButton>
                        </form>
                      )
                    )}
                  </div>
                </div>
                {f && Math.abs(Number(f.valor) - v.total) > 0.009 && (
                  <p className="mb-2 text-xs text-warn">Lançado {money(f.valor)}; houve novos recebimentos depois do lançamento.</p>
                )}
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Contrato</th><th>Cliente</th><th>Recebido</th><th>%</th><th>Comissão</th></tr></thead>
                    <tbody>
                      {v.linhas.map((l) => (
                        <tr key={l.contratoId}>
                          <td><Link className="text-gold" href={`/contratos/${l.contratoId}`}>#{l.contratoNumero}</Link></td>
                          <td>{l.cliente}</td>
                          <td>{money(l.recebido)}</td>
                          <td>{l.pct.toString().replace(".", ",")}%</td>
                          <td className="font-semibold">{money(l.comissao)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
          <p className="text-right text-sm text-ink-soft">Total do mês: <strong className="text-gold-soft">{money(total)}</strong></p>
        </div>
      )}
    </main>
  );
}
