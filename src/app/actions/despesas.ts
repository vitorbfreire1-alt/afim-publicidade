"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CategoriaDespesa } from "@prisma/client";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { addMeses } from "@/lib/financeiro";
import { data, inteiro, texto } from "@/lib/form";
import { parseMoney } from "@/lib/format";
import { CATEGORIAS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export async function criarDespesa(fd: FormData) {
  const user = await requireUser("despesas");
  const volta = (t: string) => redirect(msg("/despesas/nova", "erro", t));

  const descricao = String(fd.get("descricao") ?? "").trim();
  const categoria = String(fd.get("categoria") ?? "") as CategoriaDespesa;
  const valor = parseMoney(fd.get("valor"));
  const vencimento = data(fd, "vencimento");
  const repetir = inteiro(fd, "repetir");
  const pontoId = texto(fd, "pontoId");

  if (!descricao) volta("Informe a descrição da despesa.");
  if (!CATEGORIAS.includes(categoria)) volta("Escolha a categoria.");
  if (!(valor > 0)) volta("Informe um valor válido.");
  if (!vencimento) volta("Informe a data de vencimento.");
  if (!Number.isInteger(repetir) || repetir < 1 || repetir > 60) volta("A repetição deve ser de 1 a 60 meses.");
  if (pontoId && !(await prisma.ponto.findUnique({ where: { id: pontoId } }))) volta("Ponto inválido.");

  const grupo = repetir > 1 ? crypto.randomUUID() : null;
  await prisma.despesa.createMany({
    data: Array.from({ length: repetir }, (_, i) => ({
      descricao,
      categoria,
      fornecedor: texto(fd, "fornecedor"),
      pontoId,
      valor,
      vencimento: addMeses(vencimento!, i),
      observacoes: texto(fd, "observacoes"),
      grupo,
    })),
  });
  await registrar(user, "criou", "Despesa", null, `${descricao} (${repetir}x)`);
  revalidatePath("/", "layout");
  redirect(msg("/despesas?f=pagar", "ok", repetir > 1 ? `${repetir} despesas criadas (uma por mês).` : "Despesa cadastrada."));
}

export async function pagarDespesa(id: string, volta: string, fd: FormData) {
  const user = await requireUser("despesas");
  const pagoEm = data(fd, "pagoEm");
  const valorPago = parseMoney(fd.get("valorPago"));
  if (!pagoEm || !(valorPago > 0)) redirect(msg(volta, "erro", "Informe a data e o valor pago."));
  await prisma.despesa.update({ where: { id }, data: { pagoEm, valorPago } });
  await registrar(user, "pagou", "Despesa", id, `${valorPago}`);
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", "Pagamento registrado."));
}

export async function desfazerPagamentoDespesa(id: string, volta: string) {
  const user = await requireUser("despesas");
  await prisma.despesa.update({ where: { id }, data: { pagoEm: null, valorPago: null } });
  await registrar(user, "desfez pagamento", "Despesa", id, "");
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", "Pagamento desfeito."));
}

/** Exclui a despesa; com `serie`, exclui também as próximas (não pagas) criadas pela mesma repetição. */
export async function excluirDespesa(id: string, volta: string, serie: boolean) {
  const user = await requireUser("despesas");
  const d = await prisma.despesa.findUnique({ where: { id } });
  if (!d) redirect(msg(volta, "erro", "Despesa não encontrada."));
  if (serie && d!.grupo) {
    const r = await prisma.despesa.deleteMany({ where: { grupo: d!.grupo, pagoEm: null, vencimento: { gte: d!.vencimento } } });
    await registrar(user, "excluiu série", "Despesa", id, d!.descricao);
    revalidatePath("/", "layout");
    redirect(msg(volta, "ok", `${r.count} despesa(s) da série excluída(s).`));
  }
  await prisma.despesa.delete({ where: { id } });
  await registrar(user, "excluiu", "Despesa", id, d!.descricao);
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", "Despesa excluída."));
}
