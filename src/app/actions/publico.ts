"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Cria (ou renova) o link público do relatório de veiculação do contrato. */
export async function gerarLinkPublico(contratoId: string) {
  const user = await requireUser("editar");
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  await prisma.contrato.update({ where: { id: contratoId }, data: { tokenPublico: token } });
  await registrar(user, "gerou link público", "Contrato", contratoId, "Relatório de veiculação");
  revalidatePath(`/contratos/${contratoId}`);
  redirect(msg(`/contratos/${contratoId}`, "ok", "Link do relatório gerado."));
}

export async function desativarLinkPublico(contratoId: string) {
  const user = await requireUser("editar");
  await prisma.contrato.update({ where: { id: contratoId }, data: { tokenPublico: null } });
  await registrar(user, "desativou link público", "Contrato", contratoId, "Relatório de veiculação");
  revalidatePath(`/contratos/${contratoId}`);
  redirect(msg(`/contratos/${contratoId}`, "ok", "Link desativado."));
}
