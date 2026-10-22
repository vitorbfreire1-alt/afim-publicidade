-- Atualização 011: contrato que reserva o ponto inteiro (ocupa todas as cotas), ex.: outdoor anual.

ALTER TABLE "ContratoPonto" ADD COLUMN "ocupaTudo" BOOLEAN NOT NULL DEFAULT false;

-- Outdoors já cadastrados com 300 dias ou mais de veiculação passam a reservar o ponto inteiro.
UPDATE "ContratoPonto" cp SET "ocupaTudo" = true
FROM "Ponto" p
WHERE p."id" = cp."pontoId" AND p."tipo" = 'OUTDOOR' AND p."cotas" IS NOT NULL AND (cp."fim" - cp."inicio") >= 300;
