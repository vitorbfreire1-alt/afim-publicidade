-- Atualização 013: tabela de custos separada para triedro (a de outdoor continua como está).

ALTER TABLE "CustoOutdoor" ADD COLUMN "tipo" "TipoMidia" NOT NULL DEFAULT 'OUTDOOR';

DROP INDEX "CustoOutdoor_formato_item_key";
CREATE UNIQUE INDEX "CustoOutdoor_tipo_formato_item_key" ON "CustoOutdoor"("tipo", "formato", "item");
