-- Atualização 009: contratos pagos por permuta (sem cobrança; valor só de referência).

ALTER TYPE "FormaPagamento" ADD VALUE IF NOT EXISTS 'PERMUTA';

ALTER TABLE "Contrato" ADD COLUMN "permutaDescricao" TEXT;
