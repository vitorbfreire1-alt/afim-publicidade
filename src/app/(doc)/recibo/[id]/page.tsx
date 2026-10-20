import { notFound } from "next/navigation";
import BotaoImprimir from "@/components/BotaoImprimir";
import { requireUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { valorPorExtenso } from "@/lib/extenso";
import { dateBR, money } from "@/lib/format";
import { FORMA_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recibo", robots: { index: false } };

export default async function Recibo({ params }: { params: Promise<{ id: string }> }) {
  const [, { id }] = await Promise.all([requireUser(), params]);
  const p = await prisma.parcela.findUnique({
    where: { id },
    include: { contrato: { include: { cliente: true, pontos: { include: { ponto: true } }, _count: { select: { parcelas: true } } } } },
  });
  if (!p || !p.pagoEm) notFound();
  const empresa = await getConfig();
  const valor = Number(p.valorPago ?? p.valor);
  const c = p.contrato;

  return (
    <div className="doc">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex justify-end"><BotaoImprimir /></div>
        <article className="rounded-xl border-2 border-[#151515] p-8">
          <header className="mb-6 flex items-start justify-between gap-4 border-b border-[#ccc] pb-4">
            <div>
              <p className="text-lg font-extrabold">{empresa.nomeFantasia || empresa.razaoSocial || "AFIM Publicidade"}</p>
              {empresa.razaoSocial && empresa.nomeFantasia && <p className="text-xs text-[#555]">{empresa.razaoSocial}</p>}
              {empresa.cnpj && <p className="text-xs text-[#555]">CNPJ {empresa.cnpj}</p>}
              {empresa.endereco && <p className="text-xs text-[#555]">{empresa.endereco}{empresa.cidade && ` · ${empresa.cidade}`}</p>}
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold tracking-wide">RECIBO</h1>
              <p className="text-2xl font-extrabold">{money(valor)}</p>
            </div>
          </header>

          <p className="leading-relaxed">
            Recebemos de <strong>{c.cliente.nome}</strong>
            {c.cliente.documento && <> (CPF/CNPJ {c.cliente.documento})</>} a importância de <strong>{money(valor)}</strong> (<em>{valorPorExtenso(valor)}</em>),
            referente à <strong>parcela {p.numero} de {c._count.parcelas}</strong> do contrato <strong>nº {c.numero}</strong> de locação de espaço publicitário
            ({c.pontos.map((x) => x.ponto.nome).join(", ")}), com vencimento em {dateBR(p.vencimento)}.
          </p>
          <p className="mt-3 text-sm text-[#444]">Pagamento recebido em <strong>{dateBR(p.pagoEm)}</strong> por <strong>{p.formaRecebida ? FORMA_LABEL[p.formaRecebida] : "—"}</strong>.</p>

          <footer className="mt-12 grid grid-cols-2 items-end gap-6 text-sm">
            <p>{empresa.cidade || "—"}, {dateBR(p.pagoEm)}</p>
            <div className="border-t border-[#151515] pt-1 text-center">{empresa.nomeFantasia || empresa.razaoSocial || "AFIM Publicidade"}</div>
          </footer>
        </article>
      </div>
    </div>
  );
}
