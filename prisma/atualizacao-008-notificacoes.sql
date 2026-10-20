-- Atualização 008: notificações no celular (aparelhos inscritos de cada usuário).

CREATE TABLE "PushInscricao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushInscricao_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushInscricao_endpoint_key" ON "PushInscricao"("endpoint");
CREATE INDEX "PushInscricao_usuarioId_idx" ON "PushInscricao"("usuarioId");
ALTER TABLE "PushInscricao" ADD CONSTRAINT "PushInscricao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
