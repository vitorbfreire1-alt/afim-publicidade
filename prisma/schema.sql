-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('DONO', 'FINANCEIRO', 'COMERCIAL');

-- CreateEnum
CREATE TYPE "TipoMidia" AS ENUM ('LED', 'TOTEM', 'TRIEDRO', 'OUTDOOR');

-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('ATIVO', 'ENCERRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CategoriaDespesa" AS ENUM ('ENERGIA', 'MANUTENCAO', 'ALUGUEL_PONTO', 'IMPOSTOS', 'COMISSOES', 'FOLHA', 'MARKETING', 'OUTROS');

-- CreateEnum
CREATE TYPE "StatusProposta" AS ENUM ('ENVIADA', 'NEGOCIANDO', 'FECHADA', 'PERDIDA');

-- CreateEnum
CREATE TYPE "TipoOcorrencia" AS ENUM ('DEFEITO', 'MANUTENCAO_PREVENTIVA', 'LIMPEZA', 'TROCA_PECA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusOcorrencia" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'RESOLVIDA');

-- CreateEnum
CREATE TYPE "CategoriaArquivo" AS ENUM ('FOTO_PONTO', 'VEICULACAO', 'CONTRATO_ASSINADO', 'COMPROVANTE', 'OUTRO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'BOLETO', 'TRANSFERENCIA', 'CARTAO', 'DINHEIRO', 'OUTRO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'COMERCIAL',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "contato" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ponto" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMidia" NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "observacoes" TEXT,
    "cotas" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "larguraM" DECIMAL(6,2),
    "alturaM" DECIMAL(6,2),
    "resolucao" TEXT,
    "proprietario" TEXT,
    "proprietarioContato" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ponto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "formaPagamento" "FormaPagamento" NOT NULL DEFAULT 'PIX',
    "inicio" DATE NOT NULL,
    "fim" DATE NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "status" "StatusContrato" NOT NULL DEFAULT 'ATIVO',
    "observacoes" TEXT,
    "vendedorId" TEXT,
    "comissaoPct" DECIMAL(5,2),
    "tokenPublico" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoPonto" (
    "contratoId" TEXT NOT NULL,
    "pontoId" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "inicio" DATE NOT NULL,
    "prazoMeses" INTEGER NOT NULL,
    "fim" DATE NOT NULL,

    CONSTRAINT "ContratoPonto_pkey" PRIMARY KEY ("contratoId","pontoId")
);

-- CreateTable
CREATE TABLE "Parcela" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "vencimento" DATE NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "pagoEm" DATE,
    "valorPago" DECIMAL(12,2),
    "formaRecebida" "FormaPagamento",
    "observacoes" TEXT,
    "renegociadaEm" DATE,
    "renegociadaNoId" TEXT,
    "acordoId" TEXT,

    CONSTRAINT "Parcela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Acordo" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "contratoId" TEXT NOT NULL,
    "totalOriginal" DECIMAL(12,2) NOT NULL,
    "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAcordado" DECIMAL(12,2) NOT NULL,
    "entrada" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "parcelas" INTEGER NOT NULL,
    "primeiroVenc" DATE NOT NULL,
    "observacoes" TEXT,
    "usuarioNome" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acordo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_numero_key" ON "Contrato"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_tokenPublico_key" ON "Contrato"("tokenPublico");

-- CreateIndex
CREATE INDEX "Contrato_clienteId_idx" ON "Contrato"("clienteId");

-- CreateIndex
CREATE INDEX "Contrato_status_fim_idx" ON "Contrato"("status", "fim");

-- CreateIndex
CREATE INDEX "ContratoPonto_pontoId_idx" ON "ContratoPonto"("pontoId");

-- CreateIndex
CREATE INDEX "Parcela_vencimento_idx" ON "Parcela"("vencimento");

-- CreateIndex
CREATE INDEX "Parcela_pagoEm_idx" ON "Parcela"("pagoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Parcela_contratoId_numero_key" ON "Parcela"("contratoId", "numero");

-- CreateIndex
CREATE INDEX "Despesa_vencimento_idx" ON "Despesa"("vencimento");

-- CreateIndex
CREATE INDEX "Despesa_pagoEm_idx" ON "Despesa"("pagoEm");

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
CREATE UNIQUE INDEX "Acordo_numero_key" ON "Acordo"("numero");

-- CreateIndex
CREATE INDEX "Acordo_contratoId_idx" ON "Acordo"("contratoId");

-- CreateIndex
CREATE UNIQUE INDEX "Meta_mes_key" ON "Meta"("mes");

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoPonto" ADD CONSTRAINT "ContratoPonto_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoPonto" ADD CONSTRAINT "ContratoPonto_pontoId_fkey" FOREIGN KEY ("pontoId") REFERENCES "Ponto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_renegociadaNoId_fkey" FOREIGN KEY ("renegociadaNoId") REFERENCES "Acordo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_acordoId_fkey" FOREIGN KEY ("acordoId") REFERENCES "Acordo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_pontoId_fkey" FOREIGN KEY ("pontoId") REFERENCES "Ponto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "Acordo" ADD CONSTRAINT "Acordo_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

