-- Atualização 001: valor, início e prazo passam a ser de cada ponto do contrato.
-- Contratos que já existem: o valor mensal é dividido igualmente entre os pontos
-- e cada ponto herda o início e o prazo do contrato. As parcelas já geradas não mudam.

ALTER TABLE "ContratoPonto"
  ADD COLUMN "valor" DECIMAL(12,2),
  ADD COLUMN "inicio" DATE,
  ADD COLUMN "prazoMeses" INTEGER,
  ADD COLUMN "fim" DATE;

UPDATE "ContratoPonto" cp SET
  "valor" = ROUND(c."valorMensal" / (SELECT COUNT(*) FROM "ContratoPonto" x WHERE x."contratoId" = c."id"), 2),
  "inicio" = c."inicio",
  "prazoMeses" = c."prazoMeses",
  "fim" = c."fim"
FROM "Contrato" c
WHERE cp."contratoId" = c."id";

ALTER TABLE "ContratoPonto"
  ALTER COLUMN "valor" SET NOT NULL,
  ALTER COLUMN "inicio" SET NOT NULL,
  ALTER COLUMN "prazoMeses" SET NOT NULL,
  ALTER COLUMN "fim" SET NOT NULL;

ALTER TABLE "Contrato"
  DROP COLUMN "valorMensal",
  DROP COLUMN "prazoMeses";
