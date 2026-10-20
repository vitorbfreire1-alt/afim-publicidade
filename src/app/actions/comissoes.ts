"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { comissoesDoMes, mesValido } from "@/lib/comissoes";
import { hoje } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/** Lança a comissão do vendedor no mês como despesa (categoria Comissões), uma única vez por mês. */
export async function lancarComissao(vendedorId: string, mes: string) {
  const user = await requireUser("baixar");
  const volta = `/comissoes?mes=${mes}`;
  if (!mesValido(mes)) redirect(msg("/comissoes", "erro", "Mês inválido."));

  const [calc] = await comissoesDoMes(mes, vendedorId);
  if (!calc || calc.total <= 0) redirect(msg(volta, "erro", "Não há comissão a lançar neste mês."));
  if (await prisma.comissaoFechamento.findUnique({ where: { vendedorId_mes: { vendedorId, mes } } })) {
    redirect(msg(volta, "erro", "A comissão deste mês já foi lançada."));
  }

  const [ano, m] = mes.split("-");
  await prisma.$transaction(async (tx) => {
    const despesa = await tx.despesa.create({
      data: { descricao: `Comissão ${calc.vendedor} · ${m}/${ano}`, categoria: "COMISSOES", valor: calc.total, vencimento: hoje(), fornecedor: calc.vendedor },
    });
    await tx.comissaoFechamento.create({ data: { vendedorId, mes, base: calc.base, valor: calc.total, despesaId: despesa.id } });
  });
  await registrar(user, "lançou comissão", "Comissão", vendedorId, `${calc.vendedor} ${mes}`);
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", "Comissão lançada como despesa a pagar."));
}
