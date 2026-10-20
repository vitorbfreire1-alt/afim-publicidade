-- Atualização 010: acompanhamento de renovações (contratos perto de vencer).

CREATE TYPE "StatusRenovacao" AS ENUM ('A_CONTATAR', 'EM_NEGOCIACAO', 'VAI_RENOVAR', 'NAO_RENOVA');

ALTER TABLE "ContratoPonto" ADD COLUMN "renovacao" "StatusRenovacao" NOT NULL DEFAULT 'A_CONTATAR';
