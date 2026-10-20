import Link from "next/link";
import { MessageCircle } from "lucide-react";
import Flash from "@/components/Flash";
import { mudarRenovacao } from "@/app/actions/renovacoes";
import { pode, requireUser } from "@/lib/auth";
import { addDias, dateBR, hoje, money } from "@/lib/format";
import { TIPO_SINGULAR } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { COR_NIVEL, LIMITES, RENOVACAO_LABEL, STATUS_RENOVACAO, diasRestantes, nivelDe, textoPrazo } from "@/lib/vencimento";
import { linkRenovacao } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Renovações" };

const COR_STATUS = { A_CONTATAR: "text-ink-soft", EM_NEGOCIACAO: "text-warn", VAI_RENOVAR: "text-good", NAO_RENOVA: "text-danger" } as const;

export default async function Renovacoes({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [user, sp] = await Promise.all([requireUser("carteira"), searchParams]);
  const h = hoje();
  const v = pode(user, "valores");
  const edita = pode(user, "editar");

  // Pontos de contratos ativos que terminam nos próximos 60 dias ou terminaram nos últimos 30 sem renovação.
  const itens = await prisma.contratoPonto.findMany({
    where: { contrato: { status: "ATIVO" }, fim: { gte: addDias(h, -30), lte: addDias(h, LIMITES.atencao) } },
    orderBy: { fim: "asc" },
    include: { ponto: true, contrato: { include: { cliente: true } } },
  });

  const contagem = (limite: number) => itens.filter((i) => diasRestantes(i.fim, h) <= limite && i.contrato.formaPagamento !== "PERMUTA");
  const emRisco = (lista: typeof itens) => lista.reduce((s, i) => s + Number(i.valor), 0);

  return (
    <main>
      <Flash erro={sp.erro} ok={sp.ok} />
      <h1 className="mb-2">Renovações</h1>
      <p className="mb-5 text-sm text-ink-soft">Contratos que terminam nos próximos {LIMITES.atencao} dias (ou terminaram há pouco), do mais urgente ao menos urgente. Acompanhe aqui quem já foi chamado.</p>

      <section className="mb-5 grid grid-cols-3 gap-3">
        {([["critico", LIMITES.critico], ["alerta", LIMITES.alerta], ["atencao", LIMITES.atencao]] as const).map(([nivel, lim]) => {
          const n = itens.filter((i) => diasRestantes(i.fim, h) <= lim).length;
          return (
            <div key={nivel} className="card p-4">
              <p className="label">Até {lim} dias</p>
              <p className={`font-display text-2xl font-bold ${COR_NIVEL[nivel].replace("selo-critico", "")}`}>{n}</p>
              {v && <p className="mt-1 text-xs text-ink-soft">{money(emRisco(contagem(lim)))}/mês em risco</p>}
            </div>
          );
        })}
      </section>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Prazo</th><th>Cliente</th><th>Ponto</th>{v && <th>Valor mensal</th>}<th>Fim</th><th>Conversa</th><th></th></tr>
          </thead>
          <tbody>
            {itens.length === 0 && <tr><td colSpan={v ? 7 : 6} className="text-ink-soft">Nenhum contrato perto de vencer. Tudo em dia.</td></tr>}
            {itens.map((i) => {
              const dias = diasRestantes(i.fim, h);
              const nivel = nivelDe(dias);
              const zap = linkRenovacao(i.contrato.cliente, i.ponto.nome, i.fim);
              return (
                <tr key={`${i.contratoId}-${i.pontoId}`}>
                  <td>{nivel && <span className={`badge ${COR_NIVEL[nivel]} whitespace-nowrap`}>{textoPrazo(dias)}</span>}</td>
                  <td className="font-medium">{i.contrato.cliente.nome}{i.contrato.formaPagamento === "PERMUTA" && <span className="block text-xs text-ink-faint">permuta</span>}</td>
                  <td>{i.ponto.nome}<span className="block text-xs text-ink-faint">{TIPO_SINGULAR[i.ponto.tipo]}</span></td>
                  {v && <td className="whitespace-nowrap">{money(i.valor)}</td>}
                  <td className="whitespace-nowrap">{dateBR(i.fim)}</td>
                  <td>
                    {edita ? (
                      <form action={mudarRenovacao.bind(null, i.contratoId, i.pontoId)} className="flex items-center gap-1">
                        <select name="status" defaultValue={i.renovacao} className={`input !w-auto min-w-[9.5rem] !py-1 text-xs ${COR_STATUS[i.renovacao]}`} aria-label="Situação da renovação">
                          {STATUS_RENOVACAO.map((s) => <option key={s} value={s}>{RENOVACAO_LABEL[s]}</option>)}
                        </select>
                        <button type="submit" className="btn btn-sm">Salvar</button>
                      </form>
                    ) : (
                      <span className={COR_STATUS[i.renovacao]}>{RENOVACAO_LABEL[i.renovacao]}</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <Link className="btn btn-sm btn-gold" href={`/contratos/${i.contratoId}`}>Renovar</Link>
                      {zap && <a className="btn btn-sm" href={zap} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" /> WhatsApp</a>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-faint">Para renovar, abra o contrato e use <strong>Ações → Renovar</strong> no ponto. Ao renovar, o ponto sai desta lista.</p>
    </main>
  );
}
