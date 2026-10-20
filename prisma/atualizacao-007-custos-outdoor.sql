-- Atualização 007: tabela de custos do outdoor (impressão, lona, colagem, montagem, raspagem por formato).

-- Nova categoria de despesa
ALTER TYPE "CategoriaDespesa" ADD VALUE IF NOT EXISTS 'PRODUCAO';

-- CreateEnum
CREATE TYPE "CustoItem" AS ENUM ('IMPRESSAO', 'LONA', 'COLAGEM', 'MONTAGEM', 'RASPAGEM');

-- AlterTable
ALTER TABLE "Ponto" ADD COLUMN "formato" TEXT;

-- CreateTable
CREATE TABLE "CustoOutdoor" (
    "id" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "item" "CustoItem" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "CustoOutdoor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustoOutdoor_formato_item_key" ON "CustoOutdoor"("formato", "item");

-- Valores iniciais (da tabela da empresa)
INSERT INTO "CustoOutdoor" ("id", "formato", "item", "valor") VALUES
 (md5(random()::text || 'a'), '9x3',  'IMPRESSAO', 140),
 (md5(random()::text || 'b'), '12x3', 'IMPRESSAO', 210),
 (md5(random()::text || 'c'), '18x3', 'IMPRESSAO', 280),
 (md5(random()::text || 'd'), '9x3',  'LONA',      850),
 (md5(random()::text || 'e'), '9x3',  'COLAGEM',   100),
 (md5(random()::text || 'f'), '12x3', 'COLAGEM',   130),
 (md5(random()::text || 'g'), '18x3', 'COLAGEM',   200),
 (md5(random()::text || 'h'), '9x3',  'MONTAGEM',  180),
 (md5(random()::text || 'i'), '9x3',  'RASPAGEM',   40),
 (md5(random()::text || 'j'), '12x3', 'RASPAGEM',   60),
 (md5(random()::text || 'k'), '18x3', 'RASPAGEM',   80);
