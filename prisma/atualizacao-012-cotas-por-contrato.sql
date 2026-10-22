-- Atualização 012: quantas cotas cada contrato ocupa no ponto (ex.: triedro de 6 cotas, 2 por cliente).

ALTER TABLE "ContratoPonto" ADD COLUMN "cotasUsadas" INTEGER NOT NULL DEFAULT 1;
