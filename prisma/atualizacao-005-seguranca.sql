-- Atualização 005: proteção do login (bloqueio por tentativas) e aviso de senha fraca.
-- Só adiciona colunas; não altera nem apaga dados.

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "bloqueadoAte" TIMESTAMP(3),
ADD COLUMN     "senhaFraca" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tentativas" INTEGER NOT NULL DEFAULT 0;

