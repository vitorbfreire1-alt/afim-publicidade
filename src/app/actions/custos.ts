"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CustoItem } from "@prisma/client";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { data, normalizarFormato, texto } from "@/lib/form";
import { parseMoney } from "@/lib/format";
import { CUSTO_ITENS, CUSTO_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

/** Salva a tabela inteira: campos `v|formato|ITEM`; vazio remove o valor; `novoFormato` cria uma linha nova. */
export async function salvarCustos(fd: FormData) {
  const user = await requireUser("DONO");
  const novo = normalizarFormato(String(fd.get("novoFormato") ?? ""));
  if (novo && !/^\d+([.,]\d+)?x\d+([.,]\d+)?$/.test(novo)) {
    redirect(msg("/configuracoes", "erro", "Formato inválido. Use o padrão 9x3."));
  }
  const grava: { formato: string; item: CustoItem; valor: number }[] = [];
  const apaga: { formato: string; item: CustoItem }[] = [];
  for (const [chave, bruto] of fd.entries()) {
    if (!chave.startsWith("v|")) continue;
    const [, formatoBruto, item] = chave.split("|");
    const formato = normalizarFormato(formatoBruto === "__novo" ? novo : formatoBruto);
    if (!formato || !CUSTO_ITENS.includes(item as CustoItem)) continue;
    const digitado = String(bruto).trim();
    if (!digitado) { apaga.push({ formato, item: item as CustoItem }); continue; }
    const valor = parseMoney(digitado);
    if (!(valor >= 0)) redirect(msg("/configuracoes", "erro", `Valor inválido em ${formato} · ${CUSTO_LABEL[item as CustoItem]}.`));
    grava.push({ formato, item: item as CustoItem, valor });
  }
  await prisma.$transaction([
    ...apaga.map((a) => prisma.custoOutdoor.deleteMany({ where: a })),
    ...grava.map((g) => prisma.custoOutdoor.upsert({
      where: { formato_item: { formato: g.formato, item: g.item } },
      update: { valor: g.valor },
      create: g,
    })),
  ]);
  await registrar(user, "alterou", "CustoOutdoor", null, "Tabela de custos de outdoor e triedro");
  revalidatePath("/", "layout");
  redirect(msg("/configuracoes", "ok", "Tabela de custos salva."));
}

/** Lança como despesas (uma por serviço) os custos marcados para o ponto, pelo formato dele. */
export async function lancarCustosPonto(pontoId: string, fd: FormData) {
  const user = await requireUser("despesas");
  const volta = (tipo: "erro" | "ok", t: string) => redirect(msg(`/pontos/${pontoId}`, tipo, t));
  const ponto = await prisma.ponto.findUnique({ where: { id: pontoId } });
  if (!ponto?.formato) volta("erro", "Defina o formato do ponto antes de lançar custos.");
  const vencimento = data(fd, "vencimento");
  if (!vencimento) volta("erro", "Informe a data.");
  const marcados = CUSTO_ITENS.filter((i) => fd.get(`item_${i}`) === "on");
  if (marcados.length === 0) volta("erro", "Marque ao menos um serviço.");
  const tabela = await prisma.custoOutdoor.findMany({ where: { formato: ponto!.formato!, item: { in: marcados } } });
  if (tabela.length === 0) volta("erro", "Esses serviços não têm valor na tabela para este formato.");
  const motivo = texto(fd, "motivo");
  await prisma.despesa.createMany({
    data: tabela.map((t) => ({
      descricao: `${CUSTO_LABEL[t.item]} · ${ponto!.formato}${motivo ? ` · ${motivo}` : ""}`,
      categoria: "PRODUCAO" as const,
      fornecedor: texto(fd, "fornecedor"),
      pontoId,
      valor: t.valor,
      vencimento: vencimento!,
    })),
  });
  await registrar(user, "lançou custos", "Ponto", pontoId, tabela.map((t) => CUSTO_LABEL[t.item]).join(", "));
  revalidatePath("/", "layout");
  volta("ok", `${tabela.length} despesa(s) lançada(s) para este ponto.`);
}
