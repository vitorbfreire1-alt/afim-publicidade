-- Atualização 002: despesas (contas a pagar) e cotas por ponto.
-- Só adiciona; não altera nem apaga nada que já existe.

CREATE TYPE "CategoriaDespesa" AS ENUM ('ENERGIA', 'MANUTENCAO', 'ALUGUEL_PONTO', 'IMPOSTOS', 'COMISSOES', 'FOLHA', 'MARKETING', 'OUTROS');

ALTER TABLE "Ponto" ADD COLUMN "cotas" INTEGER;

CREATE TABLE "Despesa" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "CategoriaDespesa" NOT NULL DEFAULT 'OUTROS',
    "fornecedor" TEXT,
    "pontoId" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "vencimento" DATE NOT NULL,
    "pagoEm" DATE,
    "valorPago" DECIMAL(12,2),
    "observacoes" TEXT,
    "grupo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Despesa_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Despesa_vencimento_idx" ON "Despesa"("vencimento");
CREATE INDEX "Despesa_pagoEm_idx" ON "Despesa"("pagoEm");

ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_pontoId_fkey" FOREIGN KEY ("pontoId") REFERENCES "Ponto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
