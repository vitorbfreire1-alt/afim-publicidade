# AFIM Publicidade — controle financeiro e clientes

Sistema web (funciona no computador e no celular) para a locação de painéis de LED, totens, triedros e outdoors. Substitui as planilhas da carteira de clientes.

## O que faz

- **Carteira** — uma aba por tipo de mídia (LED, totens, triedros, outdoors) com as mesmas colunas da planilha: cliente, ponto, valor, forma de pagamento, prazo, dia de vencimento, recebimento e inadimplência acumulada (esta última é calculada, não digitada).
- **Clientes e pontos** — cadastro, busca e histórico de contratos. Um contrato pode ter vários pontos; um ponto só pode estar em um contrato ativo por vez.
- **Contratos** — ao criar, o sistema gera as parcelas mensais conforme prazo e dia de vencimento.
- **Financeiro** — registrar recebimento (data, valor, forma), desfazer, ver o que está em atraso, a vencer e recebido.
- **Painel com alertas** — inadimplência, recebido x previsto do mês, ocupação dos pontos, parcelas em atraso, vencimentos dos próximos 7 dias e contratos terminando em 60 dias.
- **Usuários com perfis** — Dono (tudo), Financeiro (registra recebimentos), Comercial (clientes, pontos e contratos).

Por enquanto só registra: não emite contratos, recibos nem boletos.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS · Prisma + PostgreSQL (Supabase) · sessão com cookie assinado (iron-session).

## Rodando localmente

```bash
npm install
cp .env.example .env     # preencha DATABASE_URL, DIRECT_URL, SESSION_SECRET e SEED_*
npx prisma db push       # cria as tabelas
npm run seed             # cria o usuário dono
npm run dev
```

Abra http://localhost:3000 e entre com o e-mail e a senha definidos em `SEED_EMAIL` / `SEED_SENHA`. Depois cadastre a equipe em **Usuários**.

## Regras de negócio

- O valor do contrato é **mensal** (soma dos pontos do contrato).
- A 1ª parcela vence no dia de vencimento do mês de início (ou do mês seguinte, se esse dia já passou); o fim do contrato é início + prazo − 1 dia.
- Parcela **em atraso** = não recebida, vencida e de contrato ativo. Contratos encerrados/cancelados saem da inadimplência.
- Dia de vencimento vai de 1 a 28, para existir em todos os meses.
