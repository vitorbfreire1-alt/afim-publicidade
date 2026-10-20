import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Foto de veiculação de um contrato compartilhado por link público (token). Só entrega fotos de veiculação desse contrato. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const a = await prisma.arquivo.findFirst({
    where: { id, categoria: "VEICULACAO", mime: { startsWith: "image/" }, contrato: { tokenPublico: token } },
  });
  if (!a) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(a.dados), {
    headers: { "Content-Type": a.mime, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
