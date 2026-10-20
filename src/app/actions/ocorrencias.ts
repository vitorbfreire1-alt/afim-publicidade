"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TipoOcorrencia } from "@prisma/client";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { data, texto } from "@/lib/form";
import { hoje, parseMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const TIPOS: TipoOcorrencia[] = ["DEFEITO", "MANUTENCAO_PREVENTIVA", "LIMPEZA", "TROCA_PECA", "OUTRO"];

export async function criarOcorrencia(fd: FormData) {
  const user = await requireUser();
  const pontoId = String(fd.get("pontoId") ?? "");
  const tipo = String(fd.get("tipo") ?? "") as TipoOcorrencia;
  const titulo = String(fd.get("titulo") ?? "").trim();
  const abertaEm = data(fd, "abertaEm") ?? hoje();
  if (!pontoId || !titulo || !TIPOS.includes(tipo)) redirect(msg("/ocorrencias/nova", "erro", "Informe o ponto, o tipo e o título."));
  if (!(await prisma.ponto.findUnique({ where: { id: pontoId } }))) redirect(msg("/ocorrencias/nova", "erro", "Ponto inválido."));

  const o = await prisma.ocorrencia.create({
    data: { pontoId, tipo, titulo, descricao: texto(fd, "descricao"), responsavel: texto(fd, "responsavel"), abertaEm, criadoPorNome: user.nome },
  });
  await registrar(user, "abriu", "Ocorrência", o.id, titulo);
  revalidatePath("/", "layout");
  redirect(msg(`/ocorrencias/${o.id}`, "ok", "Ocorrência registrada."));
}

export async function mudarStatusOcorrencia(id: string, status: "ABERTA" | "EM_ANDAMENTO") {
  const user = await requireUser();
  await prisma.ocorrencia.update({ where: { id }, data: { status, resolvidaEm: null } });
  await registrar(user, "mudou status", "Ocorrência", id, status);
  revalidatePath("/", "layout");
  redirect(msg(`/ocorrencias/${id}`, "ok", "Status atualizado."));
}

/** Resolve a ocorrência; se houve custo, gera a despesa de manutenção ligada ao ponto (a pagar). */
export async function resolverOcorrencia(id: string, fd: FormData) {
  const user = await requireUser();
  const o = await prisma.ocorrencia.findUnique({ where: { id }, include: { ponto: true } });
  if (!o) redirect(msg("/ocorrencias", "erro", "Ocorrência não encontrada."));
  if (o!.status === "RESOLVIDA") redirect(msg(`/ocorrencias/${id}`, "erro", "Esta ocorrência já foi resolvida."));

  const custoBruto = String(fd.get("custo") ?? "").trim();
  const custo = custoBruto ? parseMoney(fd.get("custo")) : 0;
  if (custoBruto && !(custo > 0)) redirect(msg(`/ocorrencias/${id}`, "erro", "Custo inválido."));
  const resolvidaEm = data(fd, "resolvidaEm") ?? hoje();

  await prisma.$transaction(async (tx) => {
    let despesaId: string | null = null;
    if (custo > 0) {
      const d = await tx.despesa.create({
        data: { descricao: `Manutenção: ${o!.titulo}`, categoria: "MANUTENCAO", valor: custo, vencimento: resolvidaEm, pontoId: o!.pontoId, fornecedor: texto(fd, "responsavel") ?? o!.responsavel },
      });
      despesaId = d.id;
    }
    await tx.ocorrencia.update({
      where: { id },
      data: { status: "RESOLVIDA", resolvidaEm, custo: custo > 0 ? custo : null, despesaId, responsavel: texto(fd, "responsavel") ?? o!.responsavel },
    });
  });
  await registrar(user, "resolveu", "Ocorrência", id, `${o!.titulo}${custo > 0 ? ` (custo ${custo})` : ""}`);
  revalidatePath("/", "layout");
  redirect(msg(`/ocorrencias/${id}`, "ok", custo > 0 ? "Ocorrência resolvida e despesa de manutenção criada." : "Ocorrência resolvida."));
}
