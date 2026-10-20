import { getUser } from "@/lib/auth";
import { enviarAviso, pushConfigurado } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Envia uma notificação de teste ao próprio usuário. */
export async function POST() {
  const user = await getUser();
  if (!user) return Response.json({ erro: "Não autorizado" }, { status: 401 });
  if (!pushConfigurado()) return Response.json({ erro: "Notificações ainda não configuradas no servidor." }, { status: 503 });
  const enviados = await enviarAviso(user.id, { titulo: "AFIM Publicidade", corpo: "Notificações ativadas neste aparelho. ✔", url: "/" });
  return Response.json({ enviados });
}
