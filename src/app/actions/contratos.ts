"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormaPagamento } from "@prisma/client";
import { msg } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { agregarParcelas, calcularFim } from "@/lib/financeiro";
import { data, inteiro, texto } from "@/lib/form";
import { parseMoney } from "@/lib/format";
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
