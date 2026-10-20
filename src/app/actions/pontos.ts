"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { normalizarFormato, texto } from "@/lib/form";
import { isTipo } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

const decimal = (fd: FormData, k: string): number | null => {
  const v = String(fd.get(k) ?? "").trim().replace(",", ".");
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

function dados(fd: FormData) {
  const tipo = String(fd.get("tipo") ?? "");
  const cotasBruto = String(fd.get("cotas") ?? "").trim();
  const cotas = cotasBruto ? Number(cotasBruto) : null;
  const latitude = decimal(fd, "latitude");
  const longitude = decimal(fd, "longitude");
  return {
    latitude: latitude !== null && latitude >= -90 && latitude <= 90 ? latitude : null,
    longitude: longitude !== null && longitude >= -180 && longitude <= 180 ? longitude : null,
    larguraM: decimal(fd, "larguraM"),
    alturaM: decimal(fd, "alturaM"),
    resolucao: texto(fd, "resolucao"),
    formato: texto(fd, "formato") ? normalizarFormato(texto(fd, "formato")!) : null,
    proprietario: texto(fd, "proprietario"),
    proprietarioContato: texto(fd, "proprietarioContato"),
    cotas: cotas !== null && Number.isInteger(cotas) && cotas >= 1 && cotas <= 1000 ? cotas : null,
    tipo: isTipo(tipo) ? tipo : null,
    nome: String(fd.get("nome") ?? "").trim(),
    endereco: texto(fd, "endereco"),
    observacoes: texto(fd, "observacoes"),
  };
}

export async function criarPonto(fd: FormData) {
  const user = await requireUser("editar");
  const { tipo, ...d } = dados(fd);
  if (!tipo || !d.nome) redirect(msg("/pontos/novo", "erro", "Informe o tipo e o nome do ponto."));
  const novo = await prisma.ponto.create({ data: { tipo, ...d } });
  await registrar(user, "criou", "Ponto", novo.id, d.nome);
  revalidatePath("/pontos");
  redirect(msg(`/pontos?tipo=${tipo}`, "ok", "Ponto cadastrado."));
}

export async function atualizarPonto(id: string, fd: FormData) {
  const user = await requireUser("editar");
  const { tipo, ...d } = dados(fd);
  if (!tipo || !d.nome) redirect(msg(`/pontos/${id}`, "erro", "Informe o tipo e o nome do ponto."));
  await prisma.ponto.update({ where: { id }, data: { tipo, ...d } });
  await registrar(user, "editou", "Ponto", id, d.nome);
  revalidatePath("/pontos");
  redirect(msg(`/pontos/${id}`, "ok", "Ponto atualizado."));
}

export async function alternarPonto(id: string) {
  const user = await requireUser("editar");
  const p = await prisma.ponto.findUniqueOrThrow({ where: { id } });
  await prisma.ponto.update({ where: { id }, data: { ativo: !p.ativo } });
  await registrar(user, p.ativo ? "desativou" : "reativou", "Ponto", id, p.nome);
  revalidatePath("/pontos");
  redirect(msg(`/pontos/${id}`, "ok", p.ativo ? "Ponto desativado." : "Ponto reativado."));
}
