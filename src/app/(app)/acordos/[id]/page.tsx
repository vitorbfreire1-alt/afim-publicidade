import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Printer } from "lucide-react";
import Flash from "@/components/Flash";
import StatusBadge from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { statusParcela } from "@/lib/financeiro";
import { dateBR, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { telefoneWhatsapp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acordo" };

export default async function AcordoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [, { id }, sp] = await Promise.all([requireUser(), params, searchParams]);
  const a = await prisma.acordo.findUnique({
    where: { id },
    include: { contrato: { include: { cliente: true } }, geradas: { orderBy: { vencimento: "asc" } }, renegociadas: { orderBy: { vencimento: "asc" } } },
  });
  if (!a) notFound();

  const cliente = a.contrato.cliente;
  const fone = telefoneWhatsapp(cliente.telefone);
  const linhas = a.geradas.map((p) => `• ${dateBR(p.vencimento)}: ${money(p.valor)}${p.observacoes?.startsWith("Entrada") ? " (entrada)" : ""}`).join("\n");
  const texto = `Olá, ${cliente.contato || cliente.nome}! Conforme combinado, segue o acordo de pagamento (AFIM Publicidade):\n\nTotal acordado: ${money(a.totalAcordado)}${Number(a.desconto) > 0 ? ` (com desconto de ${money(a.desconto)})` : ""}\n${linhas}\n\nQualquer dúvida, estamos à disposição. Obrigado!`;
  const link = fone ? `https://wa.me/${fone}?text=${encodeURIComponent(texto)}` : null;

  return (
    <main className="max-w-3xl space-y-5">
      <Flash erro={sp.erro} ok={sp.ok} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Acordo #{a.numero}</h1>
          <Link className="text-gold hover:underline" href={`/contratos/${a.contratoId}`}>{cliente.nome} · contrato #{a.contrato.numero}</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {link ? <a className="btn btn-sm" href={link} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" /> Enviar por WhatsApp</a> : <span className="text-xs text-ink-faint">Cliente sem telefone válido</span>}
          <Link className="btn btn-sm" href={`/acordos/${a.id}/imprimir`} target="_blank"><Printer className="size-4" /> Termo (imprimir)</Link>
        </div>
      </div>

      <section className="card grid gap-4 p-5 sm:grid-cols-4">
        <div><p className="label">Dívida original</p><p className="font-semibold">{money(a.totalOriginal)}</p></div>
        <div><p className="label">Desconto</p><p>{money(a.desconto)}</p></div>
        <div><p className="label">Entrada</p><p>{money(a.entrada)}</p></div>
        <div><p className="label">Total acordado</p><p className="font-display text-lg font-bold text-grad">{money(a.totalAcordado)}</p></div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gold-soft">Novas parcelas</h2>
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Observação</th></tr></thead>
            <tbody>
              {a.geradas.map((p) => (
                <tr key={p.id}><td>{dateBR(p.vencimento)}</td><td>{money(p.valor)}</td><td><StatusBadge status={statusParcela(p)} /></td><td className="text-ink-soft">{p.observacoes}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gold-soft">Parcelas renegociadas</h2>
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Vencimento original</th><th>Valor original</th></tr></thead>
            <tbody>{a.renegociadas.map((p) => <tr key={p.id}><td>{dateBR(p.vencimento)}</td><td>{money(p.valor)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      {a.observacoes && <p className="text-sm text-ink-soft">{a.observacoes}</p>}
    </main>
  );
}
