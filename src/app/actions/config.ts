"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { texto } from "@/lib/form";
import { prisma } from "@/lib/prisma";

const pct = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(",", "."));

export async function salvarConfig(fd: FormData) {
  const user = await requireUser("DONO");
  const multaPct = pct(fd.get("multaPct"));
  const jurosMesPct = pct(fd.get("jurosMesPct"));
  if (!(multaPct >= 0 && multaPct <= 30) || !(jurosMesPct >= 0 && jurosMesPct <= 30)) {
    redirect(msg("/configuracoes", "erro", "Multa e juros devem estar entre 0 e 30%."));
  }
  const dados = {
    razaoSocial: texto(fd, "razaoSocial"),
    nomeFantasia: texto(fd, "nomeFantasia"),
    cnpj: texto(fd, "cnpj"),
    endereco: texto(fd, "endereco"),
    cidade: texto(fd, "cidade"),
    telefone: texto(fd, "telefone"),
    email: texto(fd, "email"),
    multaPct,
    jurosMesPct,
  };
  await prisma.config.upsert({ where: { id: "singleton" }, update: dados, create: { id: "singleton", ...dados } });
  await registrar(user, "alterou", "Config", "singleton", `Multa ${multaPct}% · juros ${jurosMesPct}% ao mês`);
  revalidatePath("/", "layout");
  redirect(msg("/configuracoes", "ok", "Configurações salvas."));
}
