import Link from "next/link";
import AbrirLink from "@/components/AbrirLink";
import ConfirmButton from "@/components/ConfirmButton";
import Flash from "@/components/Flash";
import SeloVencimento from "@/components/SeloVencimento";
import { encerrarFinalizados } from "@/app/actions/contratos";
import { pode, requireUser } from "@/lib/auth";
import { atrasoDoPonto, statusParcela } from "@/lib/financeiro";
import { dateBR, hoje, money } from "@/lib/format";
import { FORMA_LABEL, TIPOS, TIPO_LABEL, isTipo } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Carteira de clientes" };

/** Reproduz as abas da planilha: uma carteira por tipo de mídia; cada linha é um ponto de um contrato. */
export default async function Carteira({ searchParams }: { searchParams: Promise<{ tipo?: string; finalizados?: string; erro?: string; ok?: string }> }) {
  const [user, sp] = await Promise.all([requireUser("carteira"), searchParams]);
  const tipo = isTipo(sp.tipo) ? sp.tipo : "LED";
  const h = hoje();
  const v = pode(user, "valores"); // sem esta permissão, nenhum valor em R$ é mostrado

  const itens = await prisma.contratoPonto.findMany({
    where: { ponto: { tipo }, contrato: { status: "ATIVO" } },
    orderBy: [{ contrato: { numero: "asc" } }, { ponto: { nome: "asc" } }],
    include: {
      ponto: true,
      contrato: { include: { cliente: true, parcelas: { orderBy: { numero: "asc" } } } },
    },
  });

  // Finalizado: o ponto já terminou e o contrato não tem nenhuma parcela em aberto (tudo quitado).
  const finalizado = (cp: (typeof itens)[number]) => cp.fim < h && !cp.contrato.parcelas.some((p) => !p.pagoEm && !p.renegociadaEm);
  const mostrarFinalizados = sp.finalizados === "1";
  const qtdFinalizados = itens.filter(finalizado).length;
  const visiveis = mostrarFinalizados ? itens : itens.filter((cp) => !finalizado(cp));
  // Contratos inteiros que já terminaram e estão quitados (em qualquer carteira): podem ser encerrados de uma vez.
  const paraEncerrar = await prisma.contrato.count({ where: { status: "ATIVO", fim: { lt: h }, parcelas: { none: { pagoEm: null, renegociadaEm: null } } } });

  const linhas = visiveis.map((cp) => {
    const c = cp.contrato;
    const abertas = c.parcelas.filter((p) => !p.pagoEm && !p.renegociadaEm);
    const atrasadas = abertas.filter((p) => statusParcela(p, h) === "ATRASADA");
    const proxima = abertas.find((p) => p.vencimento >= h);
    const recebimento = atrasadas.length
      ? { texto: `Em atraso (${atrasadas.length})`, sub: null, cor: "text-danger" }
      : proxima
        ? { texto: "Em dia", sub: `próx. ${dateBR(proxima.vencimento)}`, cor: "text-good" }
        : { texto: "Quitado", sub: null, cor: "text-good" };
    return {
      cp,
      recebimento,
      // Só a parte deste ponto nas parcelas em atraso do contrato.
      inadimplencia: atrasoDoPonto(cp, c.diaVencimento, atrasadas.map((p) => p.vencimento)),
      vigente: cp.inicio <= h && h <= cp.fim,
    };
  });
  const totalMensal = linhas.filter((l) => l.vigente).reduce((s, l) => s + Number(l.cp.valor), 0);
  const totalInad = linhas.reduce((s, l) => s + l.inadimplencia, 0);

  return (
    <main>
      <Flash erro={sp.erro} ok={sp.ok} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Carteira de clientes</h1>
        <div className="flex flex-wrap items-center gap-2">
          {pode(user, "editar") && paraEncerrar > 0 && (
            <form action={encerrarFinalizados}>
              <ConfirmButton className="btn btn-sm" mensagem={`Encerrar ${paraEncerrar} contrato(s) que já terminaram e estão quitados? Eles saem da carteira (continuam no histórico do cliente).`}>
                Encerrar contratos finalizados ({paraEncerrar})
              </ConfirmButton>
            </form>
          )}
          {pode(user, "editar", "valores") && (
            <Link className="btn btn-gold" href="/contratos/novo">+ Novo contrato</Link>
          )}
        </div>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {TIPOS.map((t) => (
          <Link key={t} href={`/carteira?tipo=${t}${mostrarFinalizados ? "&finalizados=1" : ""}`} className={`btn btn-sm whitespace-nowrap ${t === tipo ? "btn-gold" : ""}`}>
            {TIPO_LABEL[t]}
          </Link>
        ))}
        {qtdFinalizados > 0 && (
          <Link
            href={`/carteira?tipo=${tipo}${mostrarFinalizados ? "" : "&finalizados=1"}`}
            className={`btn btn-sm ml-auto whitespace-nowrap ${mostrarFinalizados ? "btn-gold" : ""}`}
          >
            {mostrarFinalizados ? "Ocultar finalizados" : `Mostrar finalizados (${qtdFinalizados})`}
          </Link>
        )}
      </div>

      <div className="card table-wrap">
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Nº</th><th>Cliente / Empresa</th><th>Ponto</th>{v && <><th>Valor mensal</th><th>Pagamento</th></>}
              <th>Prazo</th>{v && <><th>Dia venc.</th><th>Recebimento</th><th>Inadimplência</th></>}<th className="col-acao"><span className="sr-only">Ação</span></th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && <tr><td colSpan={v ? 10 : 5} className="text-ink-soft">Nenhum contrato ativo nesta carteira.</td></tr>}
            {linhas.map(({ cp, recebimento, inadimplencia }) => (
              <tr key={`${cp.contratoId}-${cp.pontoId}`}>
                <td><Link className="font-medium text-gold" href={`/contratos/${cp.contratoId}`}>{cp.contrato.numero}</Link></td>
                <td>{cp.contrato.cliente.nome}</td>
                <td>{cp.ponto.nome}</td>
                {v && <><td className="whitespace-nowrap">{money(cp.valor)}</td>
                <td>{FORMA_LABEL[cp.contrato.formaPagamento]}</td></>}
                <td className="whitespace-nowrap">
                  {dateBR(cp.inicio)}
                  <span className="block text-xs text-ink-faint">até {dateBR(cp.fim)}</span>
                  <SeloVencimento fim={cp.fim} />
                </td>
                {v && <><td>{cp.contrato.diaVencimento}</td>
                <td className={`whitespace-nowrap ${recebimento.cor}`}>
                  {recebimento.texto}
                  {recebimento.sub && <span className="block text-xs text-ink-faint">{recebimento.sub}</span>}
                </td>
                <td className={inadimplencia ? "font-semibold text-danger" : ""}>{money(inadimplencia)}</td></>}
                <td className="col-acao"><AbrirLink href={`/contratos/${cp.contratoId}`} rotulo={`Abrir contrato ${cp.contrato.numero} de ${cp.contrato.cliente.nome}`} /></td>
              </tr>
            ))}
          </tbody>
          {v && linhas.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} className="font-semibold text-gold">Total</td>
                <td className="font-semibold">{money(totalMensal)}</td>
                <td colSpan={4}></td>
                <td className="font-semibold text-danger">{money(totalInad)}</td>
                <td className="col-acao"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Cada linha é um ponto de um contrato{v ? ", com o valor e o prazo daquele ponto. O total soma só os pontos vigentes hoje" : ", com o prazo daquele ponto"}.
      </p>
    </main>
  );
}
