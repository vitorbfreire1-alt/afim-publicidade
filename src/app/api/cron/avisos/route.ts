import { paraUsuario } from "@/lib/auth";
import { resumoDoDia } from "@/lib/avisos";
import { prisma } from "@/lib/prisma";
import { enviarAviso, pushConfigurado } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Chamada todo dia pelo agendador do Vercel (Authorization: Bearer CRON_SECRET). */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ erro: "Não autorizado" }, { status: 401 });
  }
  if (!pushConfigurado()) return Response.json({ erro: "Notificações não configuradas" }, { status: 503 });

  const usuarios = await prisma.usuario.findMany({ where: { ativo: true, pushInscricoes: { some: {} } } });
  let avisados = 0;
  for (const row of usuarios) {
    const aviso = await resumoDoDia(paraUsuario(row));
    if (aviso && (await enviarAviso(row.id, aviso)) > 0) avisados++;
  }
  return Response.json({ usuarios: usuarios.length, avisados });
}
