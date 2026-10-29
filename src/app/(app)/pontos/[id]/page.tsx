import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Wrench } from "lucide-react";
import Anexos from "@/components/Anexos";
import Flash from "@/components/Flash";
import SeloVencimento from "@/components/SeloVencimento";
import PontoForm from "@/components/PontoForm";
import { lancarCustosPonto } from "@/app/actions/custos";
import { alternarPonto, atualizarPonto } from "@/app/actions/pontos";
import { pode, requireUser } from "@/lib/auth";
import { ocupadasEm } from "@/lib/cotas";
import { dateBR, hoje, money } from "@/lib/format";
import { CUSTO_ITENS, CUSTO_LABEL, CUSTO_TROCA, STATUS_CONTRATO_LABEL, TIPO_SINGULAR } from "@/lib/labels";
import { lucroPorPonto, ultimosMeses } from "@/lib/lucro";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_OCORRENCIA = { ABERTA: "Aberta", EM_ANDAMENTO: "Em andamento", RESOLVIDA: "Resolvida" } as const;

export default async function PontoPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const [user, { id }, { erro, ok }] = await Promise.all([requireUser("pontos"), params, searchParams]);
  const ponto = await prisma.ponto.findUnique({
    where: { id },
    include: {
      contratos: { include: { contrato: { include: { cliente: true } } }, orderBy: { inicio: "desc" } },
      ocorrencias: { orderBy: { abertaEm: "desc" }, take: 8 },
    },
  });
  if (!ponto) notFound();

  const edita = pode(user, "editar");
  const custos = (ponto.tipo === "OUTDOOR" || ponto.tipo === "TRIEDRO") && ponto.formato && pode(user, "despesas")
    ? await prisma.custoOutdoor.findMany({ where: { formato: ponto.formato } })
    : [];
  const v = pode(user, "valores");
  const verContratos = pode(user, "carteira");
  const h = hoje();
  const verFinanceiro = pode(user, "lucro");
  const lucro = verFinanceiro ? (await lucroPorPonto(ultimosMeses(12, h).inicio, h)).pontos.find((x) => x.pontoId === id) : null;
  const mapa = ponto.latitude != null && ponto.longitude != null ? `${ponto.latitude},${ponto.longitude}` : null;
  const linkMapa = mapa
    ? `https://www.google.com/maps/search/?api=1&query=${mapa}`
    : ponto.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ponto.endereco)}` : null;
  const ativos = ocupadasEm(ponto.contratos.filter((c) => c.contrato.status === "ATIVO"), ponto.cotas, h);

  return (
    <main className="max-w-4xl space-y-6">
      <Flash erro={erro} ok={ok} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>{ponto.nome}{!ponto.ativo && " (desativado)"}</h1>
          <p className="text-sm text-ink-soft">
            {TIPO_SINGULAR[ponto.tipo]}
            {ponto.larguraM != null && ponto.alturaM != null && ` · ${Number(ponto.larguraM)} × ${Number(ponto.alturaM)} m`}
            {ponto.formato && ` · formato ${ponto.formato}`}
            {ponto.resolucao && ` · ${ponto.resolucao}`}
            {ponto.cotas ? ` · ${ativos}/${ponto.cotas} cota(s) ocupada(s) hoje` : ` · ${ativos} cliente(s) hoje`}
          </p>
        </div>
        <div className="flex gap-2">
          {linkMapa && <a className="btn btn-sm" href={linkMapa} target="_blank" rel="noopener noreferrer"><MapPin className="size-4" /> Abrir no mapa</a>}
          <Link className="btn btn-sm" href={`/ocorrencias/nova?ponto=${id}`}><Wrench className="size-4" /> Registrar ocorrência</Link>
        </div>
      </div>

      {mapa && (
        <iframe
          title={`Mapa de ${ponto.nome}`}
          className="card h-64 w-full"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={`https://maps.google.com/maps?q=${mapa}&z=16&output=embed`}
        />
      )}

      {lucro !== undefined && lucro !== null && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4"><p className="label">Receita (12 meses)</p><p className="font-display text-lg font-bold text-grad">{money(lucro.receita)}</p></div>
          <div className="card p-4"><p className="label">Despesas do ponto</p><p className="font-display text-lg font-bold text-danger">{money(lucro.despesas)}</p></div>
          <div className="card p-4"><p className="label">Lucro</p><p className={`font-display text-lg font-bold ${lucro.lucro >= 0 ? "text-good" : "text-danger"}`}>{money(lucro.lucro)}</p></div>
          <div className="card p-4"><p className="label">Margem</p><p className="font-display text-lg font-bold">{lucro.margem == null ? "—" : `${lucro.margem.toString().replace(".", ",")}%`}</p></div>
        </section>
      )}

      {(ponto.proprietario || ponto.proprietarioContato) && (
        <p className="card p-4 text-sm"><span className="label !mb-1">Proprietário do imóvel</span>{ponto.proprietario} {ponto.proprietarioContato && <span className="text-ink-soft">· {ponto.proprietarioContato}</span>}</p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gold-soft">Clientes neste ponto</h2>
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Cliente</th><th>Contrato</th>{v && <th>Valor mensal</th>}<th>Período</th><th>Situação</th></tr></thead>
            <tbody>
              {ponto.contratos.length === 0 && <tr><td colSpan={5} className="text-ink-soft">Nenhum contrato ainda.</td></tr>}
              {ponto.contratos.map((cp) => (
                <tr key={cp.contratoId}>
                  <td className="font-medium">{cp.contrato.cliente.nome}</td>
                  <td>{verContratos ? <Link className="text-gold" href={`/contratos/${cp.contratoId}`}>#{cp.contrato.numero}</Link> : `#${cp.contrato.numero}`}</td>
                  {v && <td>{money(cp.valor)}</td>}
                  <td className="whitespace-nowrap">{dateBR(cp.inicio)} – {dateBR(cp.fim)} <SeloVencimento fim={cp.fim} ativo={cp.contrato.status === "ATIVO"} /></td>
                  <td>{STATUS_CONTRATO_LABEL[cp.contrato.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gold-soft">Manutenção e ocorrências</h2>
          <Link className="text-xs text-gold hover:underline" href="/ocorrencias">Ver todas</Link>
        </div>
        <div className="card">
          {ponto.ocorrencias.length === 0 ? (
            <p className="p-4 text-sm text-ink-soft">Nenhuma ocorrência registrada.</p>
          ) : (
            <ul className="divide-y divide-white/5 text-sm">
              {ponto.ocorrencias.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link href={`/ocorrencias/${o.id}`} className="min-w-0 hover:text-gold-soft"><span className="block truncate font-medium">{o.titulo}</span><span className="text-xs text-ink-faint">{dateBR(o.abertaEm)}</span></Link>
                  <span className={`badge ${o.status === "RESOLVIDA" ? "text-good" : o.status === "ABERTA" ? "text-danger" : "text-warn"}`}>{STATUS_OCORRENCIA[o.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {custos.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gold-soft">Custos de produção ({ponto.formato})</h2>
          <form action={lancarCustosPonto.bind(null, id)} className="card grid gap-4 p-4 sm:grid-cols-2">
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="label">Serviços a lançar como despesa</legend>
              {CUSTO_ITENS.filter((i) => custos.some((c) => c.item === i)).map((i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`item_${i}`} defaultChecked={CUSTO_TROCA.includes(i)} />
                  {CUSTO_LABEL[i]} <span className="text-ink-soft">· {money(custos.find((c) => c.item === i)!.valor)}</span>
                </label>
              ))}
              <p className="text-xs text-ink-faint">Por padrão vêm marcados os serviços de cada troca de arte (impressão, colagem e raspagem). Lona e montagem: marque só na instalação.</p>
            </fieldset>
            <div><label className="label" htmlFor="vencimento">Data</label><input className="input" id="vencimento" name="vencimento" type="date" defaultValue={h.toISOString().slice(0, 10)} required /></div>
            <div><label className="label" htmlFor="fornecedor">Fornecedor (opcional)</label><input className="input" id="fornecedor" name="fornecedor" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="motivo">Motivo (opcional)</label><input className="input" id="motivo" name="motivo" placeholder="Ex.: troca de arte – cliente X" /></div>
            <div className="sm:col-span-2"><button className="btn btn-gold" type="submit">Lançar custos</button></div>
          </form>
        </section>
      )}

      <Anexos titulo="Fotos do ponto" onde={{ pontoId: id, categoria: { in: ["FOTO_PONTO", "OUTRO"] } }} dono={{ pontoId: id }} categorias={["FOTO_PONTO", "OUTRO"]} volta={`/pontos/${id}`} podeEditar={edita} />

      {edita && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gold-soft">Editar ponto</h2>
          <PontoForm ponto={ponto} action={atualizarPonto.bind(null, id)} label="Salvar alterações" />
          <form action={alternarPonto.bind(null, id)} className="mt-6">
            <button className="btn btn-sm btn-danger" type="submit">{ponto.ativo ? "Desativar ponto" : "Reativar ponto"}</button>
          </form>
        </section>
      )}
    </main>
  );
}
