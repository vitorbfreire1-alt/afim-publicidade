-- Atualização 004: negociação de dívida (acordos) e metas de faturamento.
-- Só adiciona; não altera nem apaga dados existentes.

-- AlterTable
ALTER TABLE "Parcela" ADD COLUMN     "acordoId" TEXT,
ADD COLUMN     "renegociadaEm" DATE,
ADD COLUMN     "renegociadaNoId" TEXT;

-- CreateTable
CREATE TABLE "Acordo" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "contratoId" TEXT NOT NULL,
    "totalOriginal" DECIMAL(12,2) NOT NULL,
    "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAcordado" DECIMAL(12,2) NOT NULL,
    "entrada" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "parcelas" INTEGER NOT NULL,
    "primeiroVenc" DATE NOT NULL,
    "observacoes" TEXT,
    "usuarioNome" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acordo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Acordo_numero_key" ON "Acordo"("numero");

-- CreateIndex
CREATE INDEX "Acordo_contratoId_idx" ON "Acordo"("contratoId");

-- CreateIndex
CREATE UNIQUE INDEX "Meta_mes_key" ON "Meta"("mes");

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_renegociadaNoId_fkey" FOREIGN KEY ("renegociadaNoId") REFERENCES "Acordo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_acordoId_fkey" FOREIGN KEY ("acordoId") REFERENCES "Acordo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acordo" ADD CONSTRAINT "Acordo_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

