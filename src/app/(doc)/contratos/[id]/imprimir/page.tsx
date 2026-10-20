import { notFound } from "next/navigation";
import BotaoImprimir from "@/components/BotaoImprimir";
import { requireUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { valorPorExtenso } from "@/lib/extenso";
import { valorMensalAtual } from "@/lib/financeiro";
import { dateBR, hoje, money } from "@/lib/format";
import { FORMA_LABEL, TIPO_SINGULAR } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contrato", robots: { index: false } };

export default async function ContratoImpresso({ params }: { params: Promise<{ id: string }> }) {
  const [, { id }] = await Promise.all([requireUser("carteira", "valores"), params]);
  const c = await prisma.contrato.findUnique({ where: { id }, include: { cliente: true, pontos: { include: { ponto: true } } } });
  if (!c) notFound();
  const e = await getConfig();
  const mensal = valorMensalAtual(c.pontos);
  const nomeEmpresa = e.razaoSocial || e.nomeFantasia || "AFIM PUBLICIDADE";

  return (
    <div className="doc">
      <div className="mx-auto max-w-3xl px-6 py-8 text-[0.95rem] leading-relaxed">
        <div className="mb-4 flex justify-end"><BotaoImprimir /></div>
        <p className="no-print mb-4 rounded-lg border border-[#e0c875] bg-[#fff8e1] p-3 text-xs text-[#6b5200]">
          Modelo gerado automaticamente com os dados do contrato. Revise as cláusulas (com seu advogado, se preferir) antes de assinar.
        </p>

        <h1 className="mb-1 text-center text-xl font-bold uppercase">Contrato de locação de espaço publicitário nº {c.numero}</h1>
        <p className="mb-6 text-center text-sm text-[#555]">{e.cidade || ""} · {dateBR(hoje())}</p>

        <h2 className="mt-4 font-bold">Das partes</h2>
        <p><strong>LOCADORA:</strong> {nomeEmpresa}{e.cnpj && <>, CNPJ {e.cnpj}</>}{e.endereco && <>, com sede em {e.endereco}{e.cidade && `, ${e.cidade}`}</>}.</p>
        <p><strong>LOCATÁRIA:</strong> {c.cliente.nome}{c.cliente.documento && <>, inscrita sob o CPF/CNPJ {c.cliente.documento}</>}{c.cliente.contato && <>, representada por {c.cliente.contato}</>}.</p>

        <h2 className="mt-4 font-bold">Cláusula 1ª — Do objeto</h2>
        <p>A LOCADORA cede à LOCATÁRIA espaço publicitário nos pontos de mídia abaixo, para exibição de sua publicidade:</p>
        <table className="my-2">
          <thead><tr><th>Ponto</th><th>Tipo</th><th>Valor mensal</th><th>Início</th><th>Prazo</th><th>Término</th></tr></thead>
          <tbody>
            {c.pontos.map((cp) => (
              <tr key={cp.pontoId}><td>{cp.ponto.nome}</td><td>{TIPO_SINGULAR[cp.ponto.tipo]}</td><td>{money(cp.valor)}</td><td>{dateBR(cp.inicio)}</td><td>{cp.prazoMeses} meses</td><td>{dateBR(cp.fim)}</td></tr>
            ))}
          </tbody>
        </table>

        <h2 className="mt-4 font-bold">Cláusula 2ª — Do preço e do pagamento</h2>
        <p>
          A LOCATÁRIA pagará, mensalmente, o valor de <strong>{money(mensal)}</strong> (<em>{valorPorExtenso(mensal)}</em>), somando os pontos vigentes, com vencimento
          todo <strong>dia {c.diaVencimento}</strong>, por <strong>{FORMA_LABEL[c.formaPagamento]}</strong>. O valor mensal poderá variar conforme o início e o término de cada ponto acima.
        </p>

        <h2 className="mt-4 font-bold">Cláusula 3ª — Do atraso</h2>
        <p>O atraso no pagamento sujeita a LOCATÁRIA à multa de <strong>{Number(e.multaPct)}%</strong> sobre o valor devido e juros de <strong>{Number(e.jurosMesPct)}% ao mês</strong>, proporcionais aos dias de atraso.</p>

        <h2 className="mt-4 font-bold">Cláusula 4ª — Da vigência e do reajuste</h2>
        <p>O contrato vigora de <strong>{dateBR(c.inicio)}</strong> a <strong>{dateBR(c.fim)}</strong>, respeitado o prazo de cada ponto. A cada 12 (doze) meses os valores poderão ser reajustados pela variação do IGP-M ou IPCA, ou por outro índice acordado entre as partes.</p>

        <h2 className="mt-4 font-bold">Cláusula 5ª — Das obrigações</h2>
        <p>Compete à LOCADORA manter os equipamentos em funcionamento e exibir o material fornecido. Compete à LOCATÁRIA entregar o material nos formatos solicitados e responder pelo seu conteúdo, que deve observar a legislação vigente.</p>

        <h2 className="mt-4 font-bold">Cláusula 6ª — Da rescisão</h2>
        <p>Qualquer das partes poderá rescindir o contrato mediante aviso prévio por escrito de 30 (trinta) dias, ficando devidos os valores vencidos até a data da rescisão. O descumprimento de cláusula autoriza a rescisão imediata pela parte inocente.</p>

        <h2 className="mt-4 font-bold">Cláusula 7ª — Do foro</h2>
        <p>Fica eleito o foro da comarca de {e.cidade || "______________"} para dirimir quaisquer questões deste contrato.</p>

        {c.observacoes && (<><h2 className="mt-4 font-bold">Observações</h2><p>{c.observacoes}</p></>)}

        <p className="mt-8">{e.cidade || "______________"}, ____ de ______________ de ______.</p>
        <div className="mt-14 grid grid-cols-2 gap-10 text-center text-sm">
          <div className="border-t border-[#151515] pt-1">{nomeEmpresa}<br /><span className="text-xs text-[#555]">LOCADORA</span></div>
          <div className="border-t border-[#151515] pt-1">{c.cliente.nome}<br /><span className="text-xs text-[#555]">LOCATÁRIA</span></div>
        </div>
      </div>
    </div>
  );
}
