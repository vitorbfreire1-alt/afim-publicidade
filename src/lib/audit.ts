import { prisma } from "./prisma";

/** Registra no histórico quem fez o quê. Nunca deve quebrar a ação principal: falhas são ignoradas. */
export async function registrar(
  user: { id: string; nome: string },
  acao: string,
  entidade: string,
  entidadeId: string | null,
  resumo: string,
) {
  try {
    await prisma.auditoria.create({ data: { usuarioId: user.id, usuarioNome: user.nome, acao, entidade, entidadeId, resumo: resumo.slice(0, 300) } });
  } catch (e) {
    console.error("falha ao registrar histórico", e);
  }
}
