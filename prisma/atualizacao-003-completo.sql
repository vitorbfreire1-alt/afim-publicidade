-- Atualização 003: propostas, comissões, reajustes, ocorrências, arquivos, histórico, configurações e ficha do ponto.
-- Só adiciona; não altera nem apaga dados existentes.

-- CreateEnum
CREATE TYPE "StatusProposta" AS ENUM ('ENVIADA', 'NEGOCIANDO', 'FECHADA', 'PERDIDA');

-- CreateEnum
CREATE TYPE "TipoOcorrencia" AS ENUM ('DEFEITO', 'MANUTENCAO_PREVENTIVA', 'LIMPEZA', 'TROCA_PECA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusOcorrencia" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'RESOLVIDA');

-- CreateEnum
CREATE TYPE "CategoriaArquivo" AS ENUM ('FOTO_PONTO', 'VEICULACAO', 'CONTRATO_ASSINADO', 'COMPROVANTE', 'OUTRO');

-- AlterTable
ALTER TABLE "Contrato" ADD COLUMN     "comissaoPct" DECIMAL(5,2),
ADD COLUMN     "tokenPublico" TEXT,
ADD COLUMN     "vendedorId" TEXT;

-- AlterTable
ALTER TABLE "Ponto" ADD COLUMN     "alturaM" DECIMAL(6,2),
ADD COLUMN     "larguraM" DECIMAL(6,2),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "proprietario" TEXT,
ADD COLUMN     "proprietarioContato" TEXT,
ADD COLUMN     "resolucao" TEXT;

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "razaoSocial" TEXT,
    "nomeFantasia" TEXT,
    "cnpj" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "multaPct" DECIMAL(5,2) NOT NULL DEFAULT 2,
    "jurosMesPct" DECIMAL(5,2) NOT NULL DEFAULT 1,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reajuste" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "percentual" DECIMAL(6,2) NOT NULL,
    "indice" TEXT,
    "aplicadoEm" DATE NOT NULL,
    "observacoes" TEXT,
    "usuarioNome" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reajuste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposta" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "vendedorId" TEXT,
    "status" "StatusProposta" NOT NULL DEFAULT 'ENVIADA',
    "validadeAte" DATE,
    "prazoMeses" INTEGER NOT NULL DEFAULT 12,
    "observacoes" TEXT,
    "motivoPerda" TEXT,
    "contratoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropostaPonto" (
    "propostaId" TEXT NOT NULL,
    "pontoId" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PropostaPonto_pkey" PRIMARY KEY ("propostaId","pontoId")
);

-- CreateTable
CREATE TABLE "ComissaoFechamento" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "base" DECIMAL(12,2) NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "despesaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComissaoFechamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ocorrencia" (
    "id" TEXT NOT NULL,
    "pontoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoOcorrencia" NOT NULL DEFAULT 'DEFEITO',
    "status" "StatusOcorrencia" NOT NULL DEFAULT 'ABERTA',
    "abertaEm" DATE NOT NULL,
    "resolvidaEm" DATE,
    "custo" DECIMAL(12,2),
    "responsavel" TEXT,
    "despesaId" TEXT,
    "criadoPorNome" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ocorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arquivo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "dados" BYTEA NOT NULL,
    "categoria" "CategoriaArquivo" NOT NULL DEFAULT 'OUTRO',
    "descricao" TEXT,
    "dataRef" DATE,
    "contratoId" TEXT,
    "pontoId" TEXT,
    "ocorrenciaId" TEXT,
    "clienteId" TEXT,
    "enviadoPorNome" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Arquivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "usuarioNome" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "resumo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reajuste_contratoId_idx" ON "Reajuste"("contratoId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposta_numero_key" ON "Proposta"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Proposta_contratoId_key" ON "Proposta"("contratoId");

-- CreateIndex
CREATE INDEX "Proposta_status_idx" ON "Proposta"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ComissaoFechamento_despesaId_key" ON "ComissaoFechamento"("despesaId");

-- CreateIndex
CREATE UNIQUE INDEX "ComissaoFechamento_vendedorId_mes_key" ON "ComissaoFechamento"("vendedorId", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "Ocorrencia_despesaId_key" ON "Ocorrencia"("despesaId");

-- CreateIndex
CREATE INDEX "Ocorrencia_status_idx" ON "Ocorrencia"("status");

-- CreateIndex
CREATE INDEX "Ocorrencia_pontoId_idx" ON "Ocorrencia"("pontoId");

-- CreateIndex
CREATE INDEX "Arquivo_contratoId_idx" ON "Arquivo"("contratoId");

-- CreateIndex
CREATE INDEX "Arquivo_pontoId_idx" ON "Arquivo"("pontoId");

-- CreateIndex
CREATE INDEX "Arquivo_ocorrenciaId_idx" ON "Arquivo"("ocorrenciaId");

-- CreateIndex
CREATE INDEX "Arquivo_clienteId_idx" ON "Arquivo"("clienteId");

-- CreateIndex
CREATE INDEX "Auditoria_criadoEm_idx" ON "Auditoria"("criadoEm");

-- CreateIndex
CREATE INDEX "Auditoria_entidade_entidadeId_idx" ON "Auditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_tokenPublico_key" ON "Contrato"("tokenPublico");

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reajuste" ADD CONSTRAINT "Reajuste_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropostaPonto" ADD CONSTRAINT "PropostaPonto_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "Proposta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropostaPonto" ADD CONSTRAINT "PropostaPonto_pontoId_fkey" FOREIGN KEY ("pontoId") REFERENCES "Ponto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComissaoFechamento" ADD CONSTRAINT "ComissaoFechamento_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComissaoFechamento" ADD CONSTRAINT "ComissaoFechamento_despesaId_fkey" FOREIGN KEY ("despesaId") REFERENCES "Despesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_pontoId_fkey" FOREIGN KEY ("pontoId") REFERENCES "Ponto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_despesaId_fkey" FOREIGN KEY ("despesaId") REFERENCES "Despesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arquivo" ADD CONSTRAINT "Arquivo_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arquivo" ADD CONSTRAINT "Arquivo_pontoId_fkey" FOREIGN KEY ("pontoId") REFERENCES "Ponto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arquivo" ADD CONSTRAINT "Arquivo_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "Ocorrencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arquivo" ADD CONSTRAINT "Arquivo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

