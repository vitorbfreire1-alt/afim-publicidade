"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { msg } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { texto } from "@/lib/form";
import { isTipo } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

function dados(fd: FormData) {
  const tipo = String(fd.get("tipo") ?? "");
  return {
    tipo: isTipo(tipo) ? tipo : null,
    nome: String(fd.get("nome") ?? "").trim(),
    endereco: texto(fd, "endereco"),
    observacoes: texto(fd, "observacoes"),
  };
}

export async function criarPonto(fd: FormData) {
  await requireUser("COMERCIAL");
  const { tipo, ...d } = dados(fd);
  if (!tipo || !d.nome) redirect(msg("/pontos/novo", "erro", "Informe o tipo e o nome do ponto."));
  await prisma.ponto.create({ data: { tipo, ...d } });
  revalidatePath("/pontos");
  redirect(msg(`/pontos?tipo=${tipo}`, "ok", "Ponto cadastrado."));
}

export async function atualizarPonto(id: string, fd: FormData) {
  await requireUser("COMERCIAL");
  const { tipo, ...d } = dados(fd);
  if (!tipo || !d.nome) redirect(msg(`/pontos/${id}`, "erro", "Informe o tipo e o nome do ponto."));
  await prisma.ponto.update({ where: { id }, data: { tipo, ...d } });
  revalidatePath("/pontos");
  redirect(msg(`/pontos/${id}`, "ok", "Ponto atualizado."));
}

export async function alternarPonto(id: string) {
  await requireUser("COMERCIAL");
  const p = await prisma.ponto.findUniqueOrThrow({ where: { id } });
  await prisma.ponto.update({ where: { id }, data: { ativo: !p.ativo } });
  revalidatePath("/pontos");
  redirect(msg(`/pontos/${id}`, "ok", p.ativo ? "Ponto desativado." : "Ponto reativado."));
}
