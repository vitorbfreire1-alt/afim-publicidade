import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const textoCurto = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

/** Guarda o aparelho do usuário logado para receber notificações. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ erro: "Não autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = textoCurto(b?.endpoint, 2000);
  const p256dh = textoCurto(b?.keys?.p256dh, 200);
  const auth = textoCurto(b?.keys?.auth, 100);
  if (!endpoint || !p256dh || !auth || !endpoint.startsWith("https://")) return Response.json({ erro: "Inscrição inválida" }, { status: 400 });
  await prisma.pushInscricao.upsert({
    where: { endpoint },
    update: { usuarioId: user.id, p256dh, auth },
    create: { usuarioId: user.id, endpoint, p256dh, auth },
  });
  return Response.json({ ok: true });
}

/** Remove o aparelho (desativar avisos). */
export async function DELETE(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ erro: "Não autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = textoCurto(b?.endpoint, 2000);
  if (endpoint) await prisma.pushInscricao.deleteMany({ where: { endpoint, usuarioId: user.id } });
  return Response.json({ ok: true });
}
