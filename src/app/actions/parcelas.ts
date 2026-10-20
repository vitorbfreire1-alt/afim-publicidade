"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormaPagamento } from "@prisma/client";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { data } from "@/lib/form";
import { parseMoney } from "@/lib/format";
import { FORMAS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export async function receberParcela(id: string, volta: string, fd: FormData) {
  const user = await requireUser("baixar");
  const parcela = await prisma.parcela.findUniqueOrThrow({ where: { id } });

  const pagoEm = data(fd, "pagoEm");
  const valorPago = parseMoney(fd.get("valorPago"));
  const forma = String(fd.get("formaRecebida") ?? "") as FormaPagamento;
  if (!pagoEm || !(valorPago > 0) || !FORMAS.includes(forma)) {
    redirect(msg(volta, "erro", "Informe a data, o valor e a forma de recebimento."));
  }

  await prisma.parcela.update({ where: { id }, data: { pagoEm, valorPago, formaRecebida: forma } });
  await registrar(user, "recebeu", "Parcela", id, `Parcela ${parcela.numero}: ${valorPago}`);
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", `Parcela ${parcela.numero} registrada como recebida.`));
}

export async function desfazerRecebimento(id: string, volta: string) {
  const user = await requireUser("baixar");
  await prisma.parcela.update({ where: { id }, data: { pagoEm: null, valorPago: null, formaRecebida: null } });
  await registrar(user, "desfez recebimento", "Parcela", id, "");
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", "Recebimento desfeito."));
}
