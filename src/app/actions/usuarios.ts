"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Papel } from "@prisma/client";
import { msg } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAPEIS: Papel[] = ["DONO", "FINANCEIRO", "COMERCIAL"];

export async function criarUsuario(fd: FormData) {
  await requireUser("DONO");
  const nome = String(fd.get("nome") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  const papel = String(fd.get("papel") ?? "") as Papel;

  if (!nome || !email.includes("@")) redirect(msg("/usuarios", "erro", "Informe nome e e-mail válidos."));
  if (senha.length < 8) redirect(msg("/usuarios", "erro", "A senha precisa ter ao menos 8 caracteres."));
  if (!PAPEIS.includes(papel)) redirect(msg("/usuarios", "erro", "Escolha o perfil."));
  if (await prisma.usuario.findUnique({ where: { email } })) {
    redirect(msg("/usuarios", "erro", "Já existe um usuário com esse e-mail."));
  }

  await prisma.usuario.create({ data: { nome, email, papel, senhaHash: await bcrypt.hash(senha, 10) } });
  revalidatePath("/usuarios");
  redirect(msg("/usuarios", "ok", "Usuário criado."));
}

export async function alternarUsuario(id: string) {
  const eu = await requireUser("DONO");
  if (id === eu.id) redirect(msg("/usuarios", "erro", "Você não pode desativar a si mesmo."));
  const u = await prisma.usuario.findUniqueOrThrow({ where: { id } });
  await prisma.usuario.update({ where: { id }, data: { ativo: !u.ativo } });
  revalidatePath("/usuarios");
  redirect(msg("/usuarios", "ok", u.ativo ? "Usuário desativado." : "Usuário reativado."));
}

export async function redefinirSenha(id: string, fd: FormData) {
  await requireUser("DONO");
  const senha = String(fd.get("senha") ?? "");
  if (senha.length < 8) redirect(msg("/usuarios", "erro", "A senha precisa ter ao menos 8 caracteres."));
  await prisma.usuario.update({ where: { id }, data: { senhaHash: await bcrypt.hash(senha, 10) } });
  redirect(msg("/usuarios", "ok", "Senha redefinida."));
}
