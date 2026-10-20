-- Atualização 006: permissões individuais por usuário.
-- Adiciona a coluna e já preenche as permissões dos usuários existentes conforme o perfil atual (Financeiro / Comercial).
-- O Dono não precisa de lista: sempre tem acesso a tudo.

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "permissoes" TEXT[] DEFAULT ARRAY[]::TEXT[];


UPDATE "Usuario" SET "permissoes" = ARRAY['clientes','carteira','pontos','disponibilidade','manutencao','valores','receber','baixar','despesas','fluxo','comissoes','metas','relatorios','lucro'] WHERE "papel" = 'FINANCEIRO';
UPDATE "Usuario" SET "permissoes" = ARRAY['clientes','carteira','propostas','editar','pontos','disponibilidade','manutencao','valores','receber','comissoes'] WHERE "papel" = 'COMERCIAL';
