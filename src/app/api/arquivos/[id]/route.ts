import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Entrega um arquivo guardado no banco, só para usuários logados. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUser())) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  const a = await prisma.arquivo.findUnique({ where: { id } });
  if (!a) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(a.dados), {
    headers: {
      "Content-Type": a.mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(a.nome)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
