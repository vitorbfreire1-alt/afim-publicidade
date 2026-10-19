"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormaPagamento } from "@prisma/client";
import { msg } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { calcularFim, gerarParcelas } from "@/lib/financeiro";
import { data, inteiro, texto } from "@/lib/form";
import { parseMoney } from "@/lib/format";
import { FORMAS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export async function criarContrato(fd: FormData) {
  await requireUser("COMERCIAL");
  const volta = (t: string) => redirect(msg("/contratos/novo", "erro", t));

  const clienteId = String(fd.get("clienteId") ?? "");
  const pontoIds = [...new Set(fd.getAll("pontoIds").map(String))];
  const valorMensal = parseMoney(fd.get("valorMensal"));
  const forma = String(fd.get("formaPagamento") ?? "") as FormaPagamento;
  const inicio = data(fd, "inicio");
  const prazoMeses = inteiro(fd, "prazoMeses");
  const diaVencimento = inteiro(fd, "diaVencimento");

  if (!clienteId) volta("Escolha o cliente.");
  if (!pontoIds.length) volta("Escolha ao menos um ponto.");
  if (!(valorMensal > 0)) volta("Informe um valor mensal válido.");
  if (!FORMAS.includes(forma)) volta("Escolha a forma de pagamento.");
  if (!inicio) volta("Informe a data de início.");
  if (!Number.isInteger(prazoMeses) || prazoMeses < 1 || prazoMeses > 120) volta("Prazo deve ser de 1 a 120 meses.");
  if (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 28) {
    volta("O dia de vencimento deve ser de 1 a 28.");
  }

  const [cliente, pontos, ocupados] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId } }),
    prisma.ponto.findMany({ where: { id: { in: pontoIds }, ativo: true } }),
    prisma.contratoPonto.findMany({
      where: { pontoId: { in: pontoIds }, contrato: { status: "ATIVO" } },
      include: { ponto: true },
    }),
  ]);
  if (!cliente?.ativo) volta("Cliente inválido ou desativado.");
  if (pontos.length !== pontoIds.length) volta("Algum ponto escolhido não existe ou está desativado.");
  if (ocupados.length) volta(`Ponto já locado em outro contrato ativo: ${ocupados.map((o) => o.ponto.nome).join(", ")}.`);

  const contrato = await prisma.contrato.create({
    data: {
      clienteId,
      valorMensal,
      formaPagamento: forma,
      inicio: inicio!,
      prazoMeses,
      fim: calcularFim(inicio!, prazoMeses),
      diaVencimento,
      observacoes: texto(fd, "observacoes"),
      pontos: { create: pontoIds.map((pontoId) => ({ pontoId })) },
      parcelas: { create: gerarParcelas(inicio!, prazoMeses, diaVencimento, valorMensal) },
    },
  });
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${contrato.id}`, "ok", "Contrato criado e parcelas geradas."));
}

export async function mudarStatusContrato(id: string, status: "ATIVO" | "ENCERRADO" | "CANCELADO") {
  await requireUser("COMERCIAL");

  if (status === "ATIVO") {
    const c = await prisma.contrato.findUniqueOrThrow({ where: { id }, include: { pontos: true } });
    const conflito = await prisma.contratoPonto.count({
      where: { pontoId: { in: c.pontos.map((p) => p.pontoId) }, contrato: { status: "ATIVO", id: { not: id } } },
    });
    if (conflito) redirect(msg(`/contratos/${id}`, "erro", "Um dos pontos já está em outro contrato ativo."));
  }

  await prisma.contrato.update({ where: { id }, data: { status } });
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${id}`, "ok", "Status do contrato atualizado."));
}
