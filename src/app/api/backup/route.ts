import { getUser } from "@/lib/auth";
import { registrar } from "@/lib/audit";
import { gerarBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Baixa uma cópia completa dos dados. Só o Dono. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  if (user.papel !== "DONO") return new Response("Sem permissão", { status: 403 });

  const comAnexos = new URL(req.url).searchParams.get("anexos") === "1";
  const backup = await gerarBackup(comAnexos);
  await registrar(user, "baixou backup", "Backup", null, comAnexos ? "com anexos" : "sem anexos");

  const dia = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="afim-backup-${dia}${comAnexos ? "-com-anexos" : ""}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
