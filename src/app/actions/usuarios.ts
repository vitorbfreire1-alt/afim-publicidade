"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Papel } from "@prisma/client";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MODELOS, normalizar, type ModeloId } from "@/lib/permissoes";
import { validarSenha } from "@/lib/senha";


export async function criarUsuario(fd: FormData) {
  const eu = await requireUser("DONO");
  const nome = String(fd.get("nome") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  const modelo = MODELOS.find((m) => m.id === (String(fd.get("modelo") ?? "") as ModeloId));

  if (!nome || !email.includes("@")) redirect(msg("/usuarios", "erro", "Informe nome e e-mail válidos."));
  const problema = validarSenha(senha, { email, nome });
  if (problema) redirect(msg("/usuarios", "erro", problema));
  if (!modelo) redirect(msg("/usuarios", "erro", "Escolha o modelo de acesso."));
  const papel: Papel = modelo!.papel;
  const permissoes = modelo!.id === "DONO" ? [] : normalizar(fd.getAll("permissoes").map(String));
  if (await prisma.usuario.findUnique({ where: { email } })) {
    redirect(msg("/usuarios", "erro", "Já existe um usuário com esse e-mail."));
  }

  const novo = await prisma.usuario.create({ data: { nome, email, papel, permissoes, senhaHash: await bcrypt.hash(senha, 10) } });
  await registrar(eu, "criou", "Usuário", novo.id, `${nome} (${modelo!.rotulo})`);
  revalidatePath("/usuarios");
  redirect(msg("/usuarios", "ok", "Usuário criado."));
}

export async function alternarUsuario(id: string) {
  const eu = await requireUser("DONO");
  if (id === eu.id) redirect(msg("/usuarios", "erro", "Você não pode desativar a si mesmo."));
  const u = await prisma.usuario.findUniqueOrThrow({ where: { id } });
  await prisma.usuario.update({ where: { id }, data: { ativo: !u.ativo } });
  await registrar(eu, u.ativo ? "desativou" : "reativou", "Usuário", id, u.nome);
  revalidatePath("/usuarios");
  redirect(msg("/usuarios", "ok", u.ativo ? "Usuário desativado." : "Usuário reativado."));
}

export async function redefinirSenha(id: string, fd: FormData) {
  const eu = await requireUser("DONO");
  const senha = String(fd.get("senha") ?? "");
  const alvo = await prisma.usuario.findUnique({ where: { id } });
  const problema = validarSenha(senha, { email: alvo?.email, nome: alvo?.nome });
  if (problema) redirect(msg("/usuarios", "erro", problema));
  // Troca feita pelo Dono: libera o bloqueio de tentativas e limpa o aviso de senha fraca.
  await prisma.usuario.update({ where: { id }, data: { senhaHash: await bcrypt.hash(senha, 10), tentativas: 0, bloqueadoAte: null, senhaFraca: false } });
  await registrar(eu, "redefiniu a senha de", "Usuário", id, "");
  redirect(msg("/usuarios", "ok", "Senha redefinida."));
}

/** Qualquer usuário troca a própria senha, confirmando a atual. */
export async function trocarMinhaSenha(fd: FormData) {
  const eu = await requireUser();
  const atual = String(fd.get("atual") ?? "");
  const nova = String(fd.get("nova") ?? "");
  const confirmar = String(fd.get("confirmar") ?? "");
  const volta = (t: string) => redirect(msg("/conta", "erro", t));

  const user = await prisma.usuario.findUniqueOrThrow({ where: { id: eu.id } });
  if (!(await bcrypt.compare(atual, user.senhaHash))) volta("A senha atual está incorreta.");
  if (nova !== confirmar) volta("A confirmação não é igual à nova senha.");
  if (nova === atual) volta("A nova senha precisa ser diferente da atual.");
  const problema = validarSenha(nova, { email: user.email, nome: user.nome });
  if (problema) volta(problema);

  await prisma.usuario.update({ where: { id: eu.id }, data: { senhaHash: await bcrypt.hash(nova, 10), senhaFraca: false } });
  await registrar(eu, "trocou a própria senha", "Usuário", eu.id, "");
  revalidatePath("/", "layout");
  redirect(msg("/conta", "ok", "Senha alterada com sucesso."));
}

/** Altera o modelo e as permissões de um usuário (vale na hora, no próximo clique da pessoa). */
export async function salvarPermissoes(id: string, fd: FormData) {
  const eu = await requireUser("DONO");
  const volta = (t: string) => redirect(msg(`/usuarios/${id}`, "erro", t));
  const modelo = MODELOS.find((m) => m.id === (String(fd.get("modelo") ?? "") as ModeloId));
  if (!modelo) volta("Escolha o modelo de acesso.");

  const alvo = await prisma.usuario.findUnique({ where: { id } });
  if (!alvo) volta("Usuário não encontrado.");
  if (alvo!.papel === "DONO" && modelo!.papel !== "DONO") {
    if (id === eu.id) volta("Você não pode tirar o seu próprio acesso de Dono.");
    const outros = await prisma.usuario.count({ where: { papel: "DONO", ativo: true, id: { not: id } } });
    if (outros === 0) volta("É preciso manter pelo menos um Dono ativo.");
  }

  const permissoes = modelo!.id === "DONO" ? [] : normalizar(fd.getAll("permissoes").map(String));
  await prisma.usuario.update({ where: { id }, data: { papel: modelo!.papel, permissoes } });
  await registrar(eu, "alterou permissões de", "Usuário", id, `${alvo!.nome}: ${modelo!.rotulo}${modelo!.id === "DONO" ? "" : ` (${permissoes.length} permissões)`}`);
  revalidatePath("/", "layout");
  redirect(msg(`/usuarios/${id}`, "ok", "Permissões salvas. Valem já no próximo clique da pessoa."));
}
