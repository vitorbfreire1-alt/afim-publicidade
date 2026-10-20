"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validarSenha } from "@/lib/senha";
import { getSession } from "@/lib/session";

// Hash de uma senha qualquer: gasta o mesmo tempo quando o e-mail não existe.
const HASH_FALSO = bcrypt.hashSync("senha-inexistente", 10);

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MIN = 15;

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const erro = (t: string) => redirect("/login?erro=" + encodeURIComponent(t));

  const user = await prisma.usuario.findUnique({ where: { email } });
  const agora = new Date();

  // Conta bloqueada por tentativas: não testa a senha (mas gasta o mesmo tempo).
  if (user?.bloqueadoAte && user.bloqueadoAte > agora) {
    await bcrypt.compare(senha, HASH_FALSO);
    const min = Math.max(1, Math.ceil((user.bloqueadoAte.getTime() - agora.getTime()) / 60_000));
    erro(`Muitas tentativas. Acesso bloqueado; tente de novo em ${min} minuto(s).`);
  }

  const ok = await bcrypt.compare(senha, user?.senhaHash ?? HASH_FALSO);
  if (!user || !user.ativo || !ok) {
    if (user) {
      const tentativas = user.tentativas + 1;
      await prisma.usuario.update({
        where: { id: user.id },
        data: tentativas >= MAX_TENTATIVAS
          ? { tentativas: 0, bloqueadoAte: new Date(agora.getTime() + BLOQUEIO_MIN * 60_000) }
          : { tentativas },
      });
      if (tentativas >= MAX_TENTATIVAS) erro(`Muitas tentativas. Acesso bloqueado por ${BLOQUEIO_MIN} minutos.`);
    }
    erro("E-mail ou senha incorretos.");
  }

  // Login certo: zera o contador e marca se a senha ainda é fraca (para avisar no painel).
  await prisma.usuario.update({
    where: { id: user!.id },
    data: { tentativas: 0, bloqueadoAte: null, senhaFraca: validarSenha(senha, { email: user!.email, nome: user!.nome }) !== null },
  });

  const session = await getSession();
  session.userId = user!.id;
  session.nome = user!.nome;
  session.email = user!.email;
  session.papel = user!.papel;
  await session.save();
  redirect("/");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
