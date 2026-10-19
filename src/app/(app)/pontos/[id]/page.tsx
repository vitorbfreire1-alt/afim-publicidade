import { notFound } from "next/navigation";
import Flash from "@/components/Flash";
import PontoForm from "@/components/PontoForm";
import { alternarPonto, atualizarPonto } from "@/app/actions/pontos";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PontoPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const [, { id }, { erro, ok }] = await Promise.all([requireUser("COMERCIAL"), params, searchParams]);
  const ponto = await prisma.ponto.findUnique({ where: { id } });
  if (!ponto) notFound();

  return (
    <main className="max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">{ponto.nome}{!ponto.ativo && " (desativado)"}</h1>
      <Flash erro={erro} ok={ok} />
      <PontoForm ponto={ponto} action={atualizarPonto.bind(null, id)} label="Salvar alterações" />
      <form action={alternarPonto.bind(null, id)} className="mt-6">
        <button className="btn btn-sm btn-danger" type="submit">{ponto.ativo ? "Desativar ponto" : "Reativar ponto"}</button>
      </form>
    </main>
  );
}
