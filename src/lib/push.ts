import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export interface AvisoPush {
  titulo: string;
  corpo: string;
  url: string;
}

export const pushConfigurado = () =>
  Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

/** Envia o aviso a todos os aparelhos do usuário; remove os que não existem mais. Devolve quantos receberam. */
export async function enviarAviso(usuarioId: string, aviso: AvisoPush): Promise<number> {
  if (!pushConfigurado()) return 0;
  webpush.setVapidDetails(
    process.env.VAPID_CONTATO ?? "mailto:contato@afim-publicidade.vercel.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const inscricoes = await prisma.pushInscricao.findMany({ where: { usuarioId } });
  let enviados = 0;
  for (const i of inscricoes) {
    try {
      await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, JSON.stringify(aviso), { TTL: 60 * 60 * 12 });
      enviados++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await prisma.pushInscricao.delete({ where: { id: i.id } }).catch(() => {});
    }
  }
  return enviados;
}
