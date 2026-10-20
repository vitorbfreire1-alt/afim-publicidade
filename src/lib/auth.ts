import { redirect } from "next/navigation";
import type { Papel } from "@prisma/client";
import { prisma } from "./prisma";
import { getSession } from "./session";

/**
 * - DONO: tudo, inclusive usuários.
 * - FINANCEIRO: registra recebimentos e vê tudo.
 * - COMERCIAL: cadastra clientes, pontos e contratos; só consulta o financeiro.
 */
export const PAPEL_LABEL: Record<Papel, string> = {
  DONO: "Dono",
  FINANCEIRO: "Financeiro",
  COMERCIAL: "Comercial",
};

/** Exige login e que o papel esteja na lista (sem lista = qualquer usuário logado). */
export async function requireUser(...papeis: Papel[]) {
  const session = await getSession();
  if (!session.userId || !session.papel) redirect("/login");

  // Revalida no banco: usuário desativado ou com papel alterado perde o acesso na hora.
  const user = await prisma.usuario.findUnique({ where: { id: session.userId } });
  if (!user || !user.ativo) {
    session.destroy();
    redirect("/login");
  }
  if (papeis.length && user.papel !== "DONO" && !papeis.includes(user.papel)) {
    redirect("/?erro=" + encodeURIComponent("Você não tem permissão para isso."));
  }
  return { id: user.id, nome: user.nome, email: user.email, papel: user.papel };
}

/** Usuário logado e ativo, ou null (para rotas de API, que respondem 401 em vez de redirecionar). */
export async function getUser() {
  const session = await getSession();
  if (!session.userId) return null;
  const user = await prisma.usuario.findUnique({ where: { id: session.userId } });
  if (!user || !user.ativo) return null;
  return { id: user.id, nome: user.nome, email: user.email, papel: user.papel };
}

export const podeEditarCadastros = (p: Papel) => p === "DONO" || p === "COMERCIAL";
export const podeReceber = (p: Papel) => p === "DONO" || p === "FINANCEIRO";
