import Link from "next/link";
import { podeEditarCadastros, requireUser } from "@/lib/auth";
import { statusParcela } from "@/lib/financeiro";
import { dateBR, hoje, money } from "@/lib/format";
import { FORMA_LABEL, TIPOS, TIPO_LABEL, isTipo } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Carteira de clientes" };

/** Reproduz as abas da planilha: uma carteira por tipo de mídia, com as mesmas colunas. */
export default async function Carteira({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const tipo = isTipo(sp.tipo) ? sp.tipo : "LED";
  const h = hoje();

  const contratos = await prisma.contrato.findMany({
    where: { status: "ATIVO", pontos: { some: { ponto: { tipo } } } },
    orderBy: { numero: "asc" },
    include: {
      cliente: true,
      pontos: { include: { ponto: true } },
      parcelas: { orderBy: { numero: "asc" } },
    },
  });

  const linhas = contratos.map((c) => {
    const abertas = c.parcelas.filter((p) => !p.pagoEm);
    const atrasadas = abertas.filter((p) => statusParcela(p, h) === "ATRASADA");
    const proxima = abertas.find((p) => p.vencimento >= h);
    const recebimento = atrasadas.length
      ? { texto: `Em atraso (${atrasadas.length})`, cor: "text-danger" }
      : proxima
        ? { texto: `Em dia · próx. ${dateBR(proxima.vencimento)}`, cor: "text-good" }
        : { texto: "Quitado", cor: "text-good" };
    return {
      c,
      recebimento,
      inadimplencia: atrasadas.reduce((s, p) => s + Number(p.valor), 0),
    };
  });
  const totalMensal = contratos.reduce((s, c) => s + Number(c.valorMensal), 0);
  const totalInad = linhas.reduce((s, l) => s + l.inadimplencia, 0);

  return (
    <main>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Carteira de clientes</h1>
        {podeEditarCadastros(user.papel) && (
          <Link className="btn btn-gold" href="/contratos/novo">+ Novo contrato</Link>
        )}
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {TIPOS.map((t) => (
          <Link key={t} href={`/carteira?tipo=${t}`} className={`btn btn-sm whitespace-nowrap ${t === tipo ? "btn-gold" : ""}`}>
            {TIPO_LABEL[t]}
          </Link>
        ))}
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nº</th><th>Cliente / Empresa</th><th>Ponto</th><th>Valor mensal</th><th>Forma de pagamento</th>
              <th>Prazo do contrato</th><th>Dia venc.</th><th>Recebimento</th><th>Inadimplência acumulada</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && <tr><td colSpan={9} className="text-ink-soft">Nenhum contrato ativo nesta carteira.</td></tr>}
            {linhas.map(({ c, recebimento, inadimplencia }) => (
              <tr key={c.id}>
                <td><Link className="font-medium text-gold" href={`/contratos/${c.id}`}>{c.numero}</Link></td>
                <td>{c.cliente.nome}</td>
                <td>{c.pontos.filter((p) => p.ponto.tipo === tipo).map((p) => p.ponto.nome).join(", ")}</td>
                <td className="whitespace-nowrap">{money(c.valorMensal)}</td>
                <td>{FORMA_LABEL[c.formaPagamento]}</td>
                <td className="whitespace-nowrap">{dateBR(c.inicio)} – {dateBR(c.fim)}</td>
                <td>{c.diaVencimento}</td>
                <td className={`whitespace-nowrap ${recebimento.cor}`}>{recebimento.texto}</td>
                <td className={inadimplencia ? "font-semibold text-danger" : ""}>{money(inadimplencia)}</td>
              </tr>
            ))}
          </tbody>
          {linhas.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} className="font-semibold text-gold">Total</td>
                <td className="font-semibold">{money(totalMensal)}</td>
                <td colSpan={4}></td>
                <td className="font-semibold text-danger">{money(totalInad)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Contratos com pontos de mais de um tipo aparecem em cada carteira correspondente (o valor mensal é o do contrato inteiro).
      </p>
    </main>
  );
}
