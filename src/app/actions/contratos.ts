"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormaPagamento } from "@prisma/client";
import { msg } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { choqueComRecebida, recalcularPeriodo, somarParcelas } from "@/lib/contrato";
import { agregarParcelas, calcularFim, gerarParcelas } from "@/lib/financeiro";
import { data, inteiro, texto } from "@/lib/form";
import { dateBR, parseMoney } from "@/lib/format";
import { FORMAS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export async function criarContrato(fd: FormData) {
  await requireUser("COMERCIAL");
  const volta = (t: string) => redirect(msg("/contratos/novo", "erro", t));

  const clienteId = String(fd.get("clienteId") ?? "");
  const pontoIds = [...new Set(fd.getAll("pontoIds").map(String))];
  const forma = String(fd.get("formaPagamento") ?? "") as FormaPagamento;
  const diaVencimento = inteiro(fd, "diaVencimento");

  if (!clienteId) volta("Escolha o cliente.");
  if (!pontoIds.length) volta("Escolha ao menos um ponto.");
  if (!FORMAS.includes(forma)) volta("Escolha a forma de pagamento.");
  if (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 28) {
    volta("O dia de vencimento deve ser de 1 a 28.");
  }

  // Cada ponto traz o seu valor mensal, início e prazo.
  const itens = pontoIds.map((pontoId) => ({
    pontoId,
    valor: parseMoney(fd.get(`valor_${pontoId}`)),
    inicio: data(fd, `inicio_${pontoId}`),
    prazoMeses: inteiro(fd, `prazo_${pontoId}`),
  }));
  for (const it of itens) {
    if (!(it.valor > 0)) volta("Informe o valor mensal de cada ponto escolhido.");
    if (!it.inicio) volta("Informe a data de início de cada ponto escolhido.");
    if (!Number.isInteger(it.prazoMeses) || it.prazoMeses < 1 || it.prazoMeses > 120) {
      volta("O prazo de cada ponto deve ser de 1 a 120 meses.");
    }
  }

  const [cliente, pontos] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId } }),
    prisma.ponto.findMany({ where: { id: { in: pontoIds }, ativo: true } }),
  ]);
  if (!cliente?.ativo) volta("Cliente inválido ou desativado.");
  if (pontos.length !== pontoIds.length) volta("Algum ponto escolhido não existe ou está desativado.");

  const comFim = itens.map((it) => ({
    pontoId: it.pontoId,
    valor: it.valor,
    inicio: it.inicio!,
    prazoMeses: it.prazoMeses,
    fim: calcularFim(it.inicio!, it.prazoMeses),
  }));
  const time = (d: Date) => d.getTime();

  const contrato = await prisma.contrato.create({
    data: {
      clienteId,
      formaPagamento: forma,
      diaVencimento,
      inicio: new Date(Math.min(...comFim.map((i) => time(i.inicio)))),
      fim: new Date(Math.max(...comFim.map((i) => time(i.fim)))),
      observacoes: texto(fd, "observacoes"),
      pontos: { create: comFim },
      parcelas: { create: agregarParcelas(comFim, diaVencimento) },
    },
  });
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${contrato.id}`, "ok", "Contrato criado e parcelas geradas."));
}

/** `volta` é a página para onde retornar (só caminhos internos); por padrão, o próprio contrato. */
export async function mudarStatusContrato(id: string, status: "ATIVO" | "ENCERRADO" | "CANCELADO", volta?: string) {
  await requireUser("COMERCIAL");
  await prisma.contrato.update({ where: { id }, data: { status } });
  revalidatePath("/", "layout");
  const destino = volta && /^\/(?!\/)/.test(volta) ? volta : `/contratos/${id}`;
  redirect(msg(destino, "ok", status === "ATIVO" ? "Contrato reativado." : status === "ENCERRADO" ? "Contrato encerrado." : "Contrato cancelado."));
}

/** Adiciona um ponto a um contrato ativo, com valor, início e prazo próprios. */
export async function adicionarPonto(contratoId: string, fd: FormData) {
  await requireUser("COMERCIAL");
  const volta = (t: string) => redirect(msg(`/contratos/${contratoId}`, "erro", t));

  const pontoId = String(fd.get("pontoId") ?? "");
  const valor = parseMoney(fd.get("valor"));
  const inicio = data(fd, "inicio");
  const prazoMeses = inteiro(fd, "prazoMeses");
  if (!pontoId) volta("Escolha o ponto.");
  if (!(valor > 0)) volta("Informe o valor mensal do ponto.");
  if (!inicio) volta("Informe a data de início.");
  if (!Number.isInteger(prazoMeses) || prazoMeses < 1 || prazoMeses > 120) volta("O prazo deve ser de 1 a 120 meses.");

  const [contrato, ponto] = await Promise.all([
    prisma.contrato.findUnique({ where: { id: contratoId }, include: { pontos: true, parcelas: true } }),
    prisma.ponto.findUnique({ where: { id: pontoId } }),
  ]);
  if (!contrato || contrato.status !== "ATIVO") volta("Só é possível alterar contratos ativos.");
  if (!ponto?.ativo) volta("Ponto inválido ou desativado.");
  if (contrato!.pontos.some((p) => p.pontoId === pontoId)) volta("Esse ponto já está no contrato. Use Renovar para estender o prazo.");

  const novas = gerarParcelas(inicio!, prazoMeses, contrato!.diaVencimento, valor);
  const choque = choqueComRecebida(novas, contrato!.parcelas);
  if (choque) volta(`O ponto começaria cobrando em ${dateBR(choque.vencimento)}, mês que já foi recebido. Escolha um início posterior.`);

  await prisma.$transaction(async (tx) => {
    await tx.contratoPonto.create({
      data: { contratoId, pontoId, valor, inicio: inicio!, prazoMeses, fim: calcularFim(inicio!, prazoMeses) },
    });
    await somarParcelas(tx, contratoId, novas);
    await recalcularPeriodo(tx, contratoId);
  });
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${contratoId}`, "ok", "Ponto adicionado e parcelas atualizadas."));
}

/** Estende o prazo de um ponto do contrato (renovação), opcionalmente com um novo valor mensal. */
export async function renovarPonto(contratoId: string, pontoId: string, fd: FormData) {
  await requireUser("COMERCIAL");
  const volta = (t: string) => redirect(msg(`/contratos/${contratoId}`, "erro", t));

  const meses = inteiro(fd, "meses");
  const novoValorBruto = String(fd.get("valor") ?? "").trim();
  const novoValor = novoValorBruto ? parseMoney(fd.get("valor")) : null;
  if (!Number.isInteger(meses) || meses < 1 || meses > 120) volta("Informe de 1 a 120 meses de renovação.");
  if (novoValor !== null && !(novoValor > 0)) volta("O novo valor mensal é inválido.");

  const cp = await prisma.contratoPonto.findUnique({
    where: { contratoId_pontoId: { contratoId, pontoId } },
    include: { contrato: { include: { parcelas: true } } },
  });
  if (!cp || cp.contrato.status !== "ATIVO") volta("Só é possível alterar contratos ativos.");

  const valor = novoValor ?? Number(cp!.valor);
  const prazoNovo = cp!.prazoMeses + meses;
  if (prazoNovo > 240) volta("O prazo total ficaria longo demais.");
  // Só as cobranças dos meses acrescentados entram no calendário.
  const acrescimo = gerarParcelas(cp!.inicio, prazoNovo, cp!.contrato.diaVencimento, valor).slice(cp!.prazoMeses);
  const choque = choqueComRecebida(acrescimo, cp!.contrato.parcelas);
  if (choque) volta(`A renovação cobraria em ${dateBR(choque.vencimento)}, mês que já foi recebido.`);

  await prisma.$transaction(async (tx) => {
    await tx.contratoPonto.update({
      where: { contratoId_pontoId: { contratoId, pontoId } },
      data: { prazoMeses: prazoNovo, fim: calcularFim(cp!.inicio, prazoNovo), valor },
    });
    await somarParcelas(tx, contratoId, acrescimo);
    await recalcularPeriodo(tx, contratoId);
  });
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${contratoId}`, "ok", `Ponto renovado por mais ${meses} meses.`));
}
