import { notFound } from "next/navigation";
import BotaoImprimir from "@/components/BotaoImprimir";
import { requireUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { valorPorExtenso } from "@/lib/extenso";
import { dateBR, hoje, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Termo de acordo", robots: { index: false } };

export default async function TermoAcordo({ params }: { params: Promise<{ id: string }> }) {
  const [, { id }] = await Promise.all([requireUser("receber"), params]);
  const a = await prisma.acordo.findUnique({
    where: { id },
    include: { contrato: { include: { cliente: true } }, geradas: { orderBy: { vencimento: "asc" } }, renegociadas: { orderBy: { vencimento: "asc" } } },
  });
  if (!a) notFound();
  const e = await getConfig();
  const nomeEmpresa = e.razaoSocial || e.nomeFantasia || "AFIM PUBLICIDADE";
  const cli = a.contrato.cliente;

  return (
    <div className="doc">
      <div className="mx-auto max-w-3xl px-6 py-8 text-[0.95rem] leading-relaxed">
        <div className="mb-4 flex justify-end"><BotaoImprimir /></div>
        <p className="no-print mb-4 rounded-lg border border-[#e0c875] bg-[#fff8e1] p-3 text-xs text-[#6b5200]">Modelo gerado automaticamente. Revise as cláusulas antes de assinar.</p>

        <h1 className="mb-1 text-center text-xl font-bold uppercase">Termo de acordo de pagamento nº {a.numero}</h1>
        <p className="mb-6 text-center text-sm text-[#555]">{e.cidade || ""} · {dateBR(hoje())}</p>

        <p><strong>CREDORA:</strong> {nomeEmpresa}{e.cnpj && <>, CNPJ {e.cnpj}</>}.</p>
        <p><strong>DEVEDORA:</strong> {cli.nome}{cli.documento && <>, CPF/CNPJ {cli.documento}</>}.</p>

        <h2 className="mt-4 font-bold">Cláusula 1ª — Da dívida</h2>
        <p>A DEVEDORA reconhece dever à CREDORA, referente ao contrato nº {a.contrato.numero}, as parcelas vencidas abaixo, totalizando <strong>{money(a.totalOriginal)}</strong> já com multa e juros de mora até esta data.</p>
        <table className="my-2"><thead><tr><th>Vencimento original</th><th>Valor original</th></tr></thead>
          <tbody>{a.renegociadas.map((p) => <tr key={p.id}><td>{dateBR(p.vencimento)}</td><td>{money(p.valor)}</td></tr>)}</tbody></table>

        <h2 className="mt-4 font-bold">Cláusula 2ª — Do acordo</h2>
        <p>
          As partes ajustam o pagamento de <strong>{money(a.totalAcordado)}</strong> (<em>{valorPorExtenso(Number(a.totalAcordado))}</em>)
          {Number(a.desconto) > 0 && <>, após desconto de {money(a.desconto)}</>}, nas seguintes datas:
        </p>
        <table className="my-2"><thead><tr><th>Vencimento</th><th>Valor</th><th>Observação</th></tr></thead>
          <tbody>{a.geradas.map((p) => <tr key={p.id}><td>{dateBR(p.vencimento)}</td><td>{money(p.valor)}</td><td>{p.observacoes}</td></tr>)}</tbody></table>

        <h2 className="mt-4 font-bold">Cláusula 3ª — Do descumprimento</h2>
        <p>O atraso de qualquer parcela deste acordo torna vencido o saldo restante e autoriza a CREDORA a cobrar o valor integral da dívida original, abatidos os pagamentos já realizados, com os encargos previstos no contrato.</p>

        {a.observacoes && (<><h2 className="mt-4 font-bold">Observações</h2><p>{a.observacoes}</p></>)}

        <p className="mt-8">{e.cidade || "______________"}, ____ de ______________ de ______.</p>
        <div className="mt-14 grid grid-cols-2 gap-10 text-center text-sm">
          <div className="border-t border-[#151515] pt-1">{nomeEmpresa}<br /><span className="text-xs text-[#555]">CREDORA</span></div>
          <div className="border-t border-[#151515] pt-1">{cli.nome}<br /><span className="text-xs text-[#555]">DEVEDORA</span></div>
        </div>
      </div>
    </div>
  );
}
