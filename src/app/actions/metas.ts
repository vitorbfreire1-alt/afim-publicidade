"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { parseMoney } from "@/lib/format";
import { mesValido } from "@/lib/comissoes";
import { prisma } from "@/lib/prisma";

/** Define (ou limpa, se vazio) a meta de faturamento de um mês. */
export async function definirMeta(fd: FormData) {
  const user = await requireUser("DONO");
  const mes = mesValido(String(fd.get("mes") ?? ""));
  if (!mes) redirect(msg("/indicadores", "erro", "Mês inválido."));
  const bruto = String(fd.get("valor") ?? "").trim();

  if (!bruto) {
    await prisma.meta.deleteMany({ where: { mes: mes! } });
    await registrar(user, "removeu meta", "Meta", mes!, mes!);
    revalidatePath("/", "layout");
    redirect(msg("/indicadores", "ok", "Meta removida."));
  }
  const valor = parseMoney(fd.get("valor"));
  if (!(valor > 0)) redirect(msg("/indicadores", "erro", "Informe um valor de meta válido."));
  await prisma.meta.upsert({ where: { mes: mes! }, update: { valor }, create: { mes: mes!, valor } });
  await registrar(user, "definiu meta", "Meta", mes!, `${mes}: ${valor}`);
  revalidatePath("/", "layout");
  redirect(msg("/indicadores", "ok", "Meta salva."));
}
