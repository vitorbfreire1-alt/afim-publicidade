import { redirect } from "next/navigation";
import type { Papel } from "@prisma/client";
import { prisma } from "./prisma";
import { permissoesDe, pode, rotuloPerfil, type Permissao } from "./permissoes";

export { pode };
import { getSession } from "./session";

export const PAPEL_LABEL: Record<Papel, string> = {
  DONO: "Dono",
  FINANCEIRO: "Financeiro",
  COMERCIAL: "Comercial",
};

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  permissoes: Permissao[];
  perfil: string;
  senhaFraca: boolean;
}

type Exigencia = Permissao | "DONO";

export const paraUsuario = (u: { id: string; nome: string; email: string; papel: Papel; permissoes: string[]; senhaFraca: boolean }): UsuarioLogado => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  papel: u.papel,
  permissoes: permissoesDe(u.papel, u.permissoes),
  perfil: rotuloPerfil(u.papel, u.permissoes),
  senhaFraca: u.senhaFraca,
});

/**
 * Exige login e, se pedido, permissões ("DONO" = só o Dono). Os dados são relidos do banco a cada pedido:
 * mudar as permissões de alguém vale na hora, e quem for desativado perde o acesso imediatamente.
 */
export async function requireUser(...exigencias: Exigencia[]): Promise<UsuarioLogado> {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const row = await prisma.usuario.findUnique({ where: { id: session.userId } });
  if (!row || !row.ativo) {
    session.destroy();
    redirect("/login");
  }
  const user = paraUsuario(row);

  if (exigencias.includes("DONO") && user.papel !== "DONO") redirect("/?erro=" + encodeURIComponent("Você não tem permissão para isso."));
  const permissoes = exigencias.filter((e): e is Permissao => e !== "DONO");
  if (!pode(user, ...permissoes)) redirect("/?erro=" + encodeURIComponent("Você não tem permissão para isso."));
  return user;
}

/** Usuário logado e ativo, ou null (para rotas de API, que respondem 401 em vez de redirecionar). */
export async function getUser(): Promise<UsuarioLogado | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const row = await prisma.usuario.findUnique({ where: { id: session.userId } });
  if (!row || !row.ativo) return null;
  return paraUsuario(row);
}
