"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { texto } from "@/lib/form";
import { prisma } from "@/lib/prisma";

function dados(fd: FormData) {
  return {
    nome: String(fd.get("nome") ?? "").trim(),
    documento: texto(fd, "documento"),
    contato: texto(fd, "contato"),
    telefone: texto(fd, "telefone"),
    email: texto(fd, "email"),
    observacoes: texto(fd, "observacoes"),
  };
}

export async function criarCliente(fd: FormData) {
  const user = await requireUser("editar");
  const d = dados(fd);
  if (!d.nome) redirect(msg("/clientes/novo", "erro", "Informe o nome do cliente."));
  const c = await prisma.cliente.create({ data: d });
  await registrar(user, "criou", "Cliente", c.id, c.nome);
  revalidatePath("/clientes");
  if (fd.get("proximo") === "contrato") redirect(`/contratos/novo?cliente=${c.id}`);
  redirect(msg(`/clientes/${c.id}`, "ok", "Cliente cadastrado."));
}

export async function atualizarCliente(id: string, fd: FormData) {
  const user = await requireUser("editar");
  const d = dados(fd);
  if (!d.nome) redirect(msg(`/clientes/${id}`, "erro", "Informe o nome do cliente."));
  await prisma.cliente.update({ where: { id }, data: d });
  await registrar(user, "editou", "Cliente", id, d.nome);
  revalidatePath("/clientes");
  redirect(msg(`/clientes/${id}`, "ok", "Cliente atualizado."));
}

export async function alternarCliente(id: string) {
  const user = await requireUser("editar");
  const c = await prisma.cliente.findUniqueOrThrow({ where: { id } });
  await prisma.cliente.update({ where: { id }, data: { ativo: !c.ativo } });
  await registrar(user, c.ativo ? "desativou" : "reativou", "Cliente", id, c.nome);
  revalidatePath("/clientes");
  redirect(msg(`/clientes/${id}`, "ok", c.ativo ? "Cliente desativado." : "Cliente reativado."));
}
