import { prisma } from "./prisma";

/** Configurações da empresa (cria a linha com os padrões na primeira leitura). */
export async function getConfig() {
  return prisma.config.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });
}
