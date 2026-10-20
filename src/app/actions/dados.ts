"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Apaga dados (irreversível). `movimentos` mantém clientes e pontos; `tudo` apaga também clientes e pontos.
 * Usuários, configurações e o histórico de alterações nunca são apagados.
 */
export async function zerarDados(fd: FormData) {
  const user = await requireUser("DONO");
  const modo = String(fd.get("modo") ?? "");
  const frase = String(fd.get("confirmacao") ?? "").trim();
  if (modo !== "movimentos" && modo !== "tudo") redirect(msg("/dados", "erro", "Escolha o que apagar."));
  if (frase !== "APAGAR") redirect(msg("/dados", "erro", 'Para confirmar, digite APAGAR (em maiúsculas) no campo.'));

  const total = await prisma.$transaction(async (tx) => {
    let n = 0;
    // Ordem que respeita as ligações entre as tabelas.
    n += (await tx.arquivo.deleteMany()).count;
    n += (await tx.comissaoFechamento.deleteMany()).count;
    n += (await tx.proposta.deleteMany()).count; // leva os pontos da proposta junto
    n += (await tx.ocorrencia.deleteMany()).count;
    n += (await tx.parcela.deleteMany()).count;
    n += (await tx.acordo.deleteMany()).count;
    n += (await tx.reajuste.deleteMany()).count;
    n += (await tx.contratoPonto.deleteMany()).count;
    n += (await tx.contrato.deleteMany()).count;
    n += (await tx.despesa.deleteMany()).count;
    n += (await tx.meta.deleteMany()).count;
    if (modo === "tudo") {
      n += (await tx.ponto.deleteMany()).count;
      n += (await tx.cliente.deleteMany()).count;
    }
    // Recomeça a numeração de contratos, propostas e acordos.
    for (const seq of ["Contrato_numero_seq", "Proposta_numero_seq", "Acordo_numero_seq"]) {
      await tx.$executeRawUnsafe(`ALTER SEQUENCE "${seq}" RESTART WITH 1`);
    }
    return n;
  });

  await registrar(user, "apagou dados", "Dados", null, `${modo === "tudo" ? "tudo (inclui clientes e pontos)" : "movimentações"}: ${total} registro(s)`);
  revalidatePath("/", "layout");
  redirect(msg("/dados", "ok", `Pronto: ${total} registro(s) apagado(s). A numeração recomeça do 1.`));
}
