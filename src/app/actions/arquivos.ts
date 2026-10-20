"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CategoriaArquivo } from "@prisma/client";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { pode, requireUser } from "@/lib/auth";
import { data, texto } from "@/lib/form";
import { prisma } from "@/lib/prisma";

const MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 3.5 * 1024 * 1024;
const CATEGORIAS: CategoriaArquivo[] = ["FOTO_PONTO", "VEICULACAO", "CONTRATO_ASSINADO", "COMPROVANTE", "OUTRO"];

/** Assinatura real do arquivo (não confia só no tipo declarado pelo navegador). */
function tipoReal(b: Buffer): string | null {
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (b.length > 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (b.length > 4 && b.subarray(0, 4).toString() === "%PDF") return "application/pdf";
  return null;
}

export async function enviarArquivo(volta: string, fd: FormData) {
  const user = await requireUser();
  // Quem registra manutenção ou edita cadastros pode anexar fotos e arquivos.
  if (!pode(user, "editar") && !pode(user, "manutencao")) redirect(msg(volta, "erro", "Você não tem permissão para enviar arquivos."));
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) redirect(msg(volta, "erro", "Escolha um arquivo."));
  const f = arquivo as File;
  if (f.size > MAX_BYTES) redirect(msg(volta, "erro", "Arquivo grande demais (máximo 3,5 MB). Fotos são reduzidas automaticamente."));
  const dados = Buffer.from(await f.arrayBuffer());
  const mime = tipoReal(dados);
  if (!mime || !MIMES.includes(mime)) redirect(msg(volta, "erro", "Só são aceitos JPG, PNG, WebP e PDF."));

  const categoria = String(fd.get("categoria") ?? "OUTRO") as CategoriaArquivo;
  const contratoId = texto(fd, "contratoId");
  const pontoId = texto(fd, "pontoId");
  const ocorrenciaId = texto(fd, "ocorrenciaId");
  const clienteId = texto(fd, "clienteId");
  if (!CATEGORIAS.includes(categoria)) redirect(msg(volta, "erro", "Categoria inválida."));
  if (!contratoId && !pontoId && !ocorrenciaId && !clienteId) redirect(msg(volta, "erro", "Arquivo sem destino."));

  const a = await prisma.arquivo.create({
    data: {
      nome: f.name.slice(0, 120) || "arquivo",
      mime,
      tamanho: dados.length,
      dados,
      categoria,
      descricao: texto(fd, "descricao"),
      dataRef: data(fd, "dataRef"),
      contratoId,
      pontoId,
      ocorrenciaId,
      clienteId,
      enviadoPorNome: user.nome,
    },
    select: { id: true },
  });
  await registrar(user, "enviou arquivo", "Arquivo", a.id, `${f.name} (${categoria})`);
  revalidatePath(volta.split("?")[0]);
  redirect(msg(volta, "ok", "Arquivo enviado."));
}

export async function excluirArquivo(id: string, volta: string) {
  const user = await requireUser("editar");
  const a = await prisma.arquivo.findUnique({ where: { id }, select: { nome: true } });
  await prisma.arquivo.delete({ where: { id } }).catch(() => null);
  if (a) await registrar(user, "excluiu arquivo", "Arquivo", id, a.nome);
  revalidatePath(volta.split("?")[0]);
  redirect(msg(volta, "ok", "Arquivo excluído."));
}
