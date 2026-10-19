"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormaPagamento } from "@prisma/client";
import { msg } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { data } from "@/lib/form";
import { parseMoney } from "@/lib/format";
import { FORMAS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export async function receberParcela(id: string, volta: string, fd: FormData) {
  await requireUser("FINANCEIRO");
  const parcela = await prisma.parcela.findUniqueOrThrow({ where: { id } });

  const pagoEm = data(fd, "pagoEm");
  const valorPago = parseMoney(fd.get("valorPago"));
  const forma = String(fd.get("formaRecebida") ?? "") as FormaPagamento;
  if (!pagoEm || !(valorPago > 0) || !FORMAS.includes(forma)) {
    redirect(msg(volta, "erro", "Informe a data, o valor e a forma de recebimento."));
  }

  await prisma.parcela.update({ where: { id }, data: { pagoEm, valorPago, formaRecebida: forma } });
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", `Parcela ${parcela.numero} registrada como recebida.`));
}

export async function desfazerRecebimento(id: string, volta: string) {
  await requireUser("FINANCEIRO");
  await prisma.parcela.update({ where: { id }, data: { pagoEm: null, valorPago: null, formaRecebida: null } });
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", "Recebimento desfeito."));
}
