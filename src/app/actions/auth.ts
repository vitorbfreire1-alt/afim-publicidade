"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Hash de uma senha qualquer: gasta o mesmo tempo quando o e-mail não existe.
const HASH_FALSO = bcrypt.hashSync("senha-inexistente", 10);

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  const user = await prisma.usuario.findUnique({ where: { email } });
  const ok = await bcrypt.compare(senha, user?.senhaHash ?? HASH_FALSO);
  if (!user || !user.ativo || !ok) redirect("/login?erro=" + encodeURIComponent("E-mail ou senha incorretos."));

  const session = await getSession();
  session.userId = user.id;
  session.nome = user.nome;
  session.email = user.email;
  session.papel = user.papel;
  await session.save();
  redirect("/");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
