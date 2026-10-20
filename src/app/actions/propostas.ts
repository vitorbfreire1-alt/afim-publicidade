"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StatusProposta } from "@prisma/client";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { data, inteiro, texto } from "@/lib/form";
import { parseMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const STATUS: StatusProposta[] = ["ENVIADA", "NEGOCIANDO", "FECHADA", "PERDIDA"];

export async function criarProposta(fd: FormData) {
  const user = await requireUser("COMERCIAL");
  const volta = (t: string) => redirect(msg("/propostas/nova", "erro", t));

  const clienteId = String(fd.get("clienteId") ?? "");
  const pontoIds = [...new Set(fd.getAll("pontoIds").map(String))];
  const prazoMeses = inteiro(fd, "prazoMeses");
  if (!clienteId) volta("Escolha o cliente.");
  if (!pontoIds.length) volta("Escolha ao menos um ponto.");
  if (!Number.isInteger(prazoMeses) || prazoMeses < 1 || prazoMeses > 120) volta("O prazo deve ser de 1 a 120 meses.");
  const itens = pontoIds.map((pontoId) => ({ pontoId, valor: parseMoney(fd.get(`valor_${pontoId}`)) }));
  if (itens.some((i) => !(i.valor > 0))) volta("Informe o valor mensal de cada ponto.");

  const vendedorId = texto(fd, "vendedorId");
  const p = await prisma.proposta.create({
    data: {
      clienteId,
      vendedorId,
      prazoMeses,
      validadeAte: data(fd, "validadeAte"),
      observacoes: texto(fd, "observacoes"),
      pontos: { create: itens },
    },
  });
  await registrar(user, "criou", "Proposta", p.id, `Proposta #${p.numero}`);
  revalidatePath("/propostas");
  redirect(msg(`/propostas/${p.id}`, "ok", "Proposta criada."));
}

export async function mudarStatusProposta(id: string, status: StatusProposta, fd?: FormData) {
  const user = await requireUser("COMERCIAL");
  if (!STATUS.includes(status) || status === "FECHADA") redirect(msg(`/propostas/${id}`, "erro", "Para fechar, converta a proposta em contrato."));
  await prisma.proposta.update({
    where: { id },
    data: { status, motivoPerda: status === "PERDIDA" ? texto(fd ?? new FormData(), "motivoPerda") : null },
  });
  await registrar(user, "mudou status", "Proposta", id, status);
  revalidatePath("/propostas");
  redirect(msg(`/propostas/${id}`, "ok", "Status atualizado."));
}

export async function excluirProposta(id: string) {
  const user = await requireUser("COMERCIAL");
  const p = await prisma.proposta.findUnique({ where: { id } });
  if (p?.contratoId) redirect(msg(`/propostas/${id}`, "erro", "Esta proposta já virou contrato e não pode ser excluída."));
  await prisma.proposta.delete({ where: { id } }).catch(() => null);
  await registrar(user, "excluiu", "Proposta", id, `Proposta #${p?.numero ?? "?"}`);
  revalidatePath("/propostas");
  redirect(msg("/propostas", "ok", "Proposta excluída."));
}
