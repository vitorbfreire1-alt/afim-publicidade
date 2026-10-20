"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StatusRenovacao } from "@prisma/client";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RENOVACAO_LABEL, STATUS_RENOVACAO } from "@/lib/vencimento";

/** Registra como está a conversa de renovação de um ponto de contrato. */
export async function mudarRenovacao(contratoId: string, pontoId: string, fd: FormData) {
  const user = await requireUser("editar");
  const status = String(fd.get("status") ?? "") as StatusRenovacao;
  if (!STATUS_RENOVACAO.includes(status)) redirect(msg("/renovacoes", "erro", "Situação inválida."));
  await prisma.contratoPonto.update({ where: { contratoId_pontoId: { contratoId, pontoId } }, data: { renovacao: status } });
  await registrar(user, "renovação", "Contrato", contratoId, RENOVACAO_LABEL[status]);
  revalidatePath("/renovacoes");
  redirect(msg("/renovacoes", "ok", `Situação: ${RENOVACAO_LABEL[status]}.`));
}
