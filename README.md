# AFIM Publicidade — controle financeiro e clientes

Sistema web (funciona no computador e no celular) para a locação de painéis de LED, totens, triedros e outdoors. Substitui as planilhas da carteira de clientes.

## O que faz

**Dia a dia**
- **Carteira** por tipo de mídia (LED, totem, triedro, outdoor), com valor, prazo e inadimplência de cada ponto.
- **Clientes, pontos e contratos** — um contrato pode ter vários pontos, cada um com valor, início e prazo próprios; um ponto pode ter vários clientes (com limite opcional de **cotas**, que bloqueia contratos que lotariam o ponto).
- **Renovar / adicionar pontos** a contratos existentes e **reajuste anual** (IGP-M, IPCA ou acordo), com aviso no painel.
- **Propostas** em funil (enviada → negociando → fechada/perdida), com conversão em contrato já preenchido.
- **Disponibilidade** — grade de pontos por mês: livre, parcial ou lotado.

**Financeiro**
- **A receber** — baixa de parcelas, **multa e juros** automáticos sobre o atraso (configuráveis), **cobrança por WhatsApp** com mensagem pronta.
- **Despesas** com repetição mensal, **fluxo de caixa** (previsto x realizado), **comissões** de vendedores (lançadas como despesa) e **lucro por ponto**.
- **Relatórios** (faturamento por mês/tipo/cliente, despesas por categoria, inadimplência por faixa de atraso) e **exportação em CSV/Excel**.

**Documentos e operação**
- **Recibo**, **extrato do cliente** e **contrato** prontos para imprimir ou salvar em PDF.
- **Manutenção e ocorrências** por ponto (com custo que vira despesa), **ficha do ponto** (mapa, medidas, proprietário, fotos).
- **Comprovação de veiculação** com fotos e **link público** para o cliente ver (sem login e sem valores).
- **Anexos** (contrato assinado, comprovantes) e **histórico de alterações** (quem fez o quê).
- **Usuários com perfis** — Dono (tudo), Financeiro (recebimentos, despesas, relatórios) e Comercial (clientes, pontos, contratos, propostas).

Fora do escopo por enquanto: boleto/Pix automático e assinatura eletrônica (dependem de serviços externos pagos) e a importação das planilhas.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS · Prisma + PostgreSQL (Supabase) · sessão com cookie assinado (iron-session).

## Rodando localmente

```bash
npm install
cp .env.example .env     # preencha DATABASE_URL, DIRECT_URL, SESSION_SECRET e SEED_*
npx prisma db push       # cria as tabelas (ou rode prisma/schema.sql no SQL Editor do Supabase)
npm run seed             # cria o usuário dono
npm run dev
```

Abra http://localhost:3000 e entre com o e-mail e a senha definidos em `SEED_EMAIL` / `SEED_SENHA`. Depois cadastre a equipe em **Usuários**.

## Regras de negócio

- O valor do contrato é **mensal** (soma dos pontos do contrato).
- A 1ª parcela vence no dia de vencimento do mês de início (ou do mês seguinte, se esse dia já passou); o fim do contrato é início + prazo − 1 dia.
- Parcela **em atraso** = não recebida, vencida e de contrato ativo. Contratos encerrados/cancelados saem da inadimplência.
- Dia de vencimento vai de 1 a 28, para existir em todos os meses.
