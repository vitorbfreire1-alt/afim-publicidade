"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { renumerarParcelas } from "@/lib/contrato";
import { calcularEncargos, regrasDe } from "@/lib/encargos";
import { addMeses } from "@/lib/financeiro";
import { data, inteiro, texto } from "@/lib/form";
import { hoje, parseMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const centavos = (n: number) => Math.round(n * 100);

/**
 * Negociação de dívida: as parcelas vencidas escolhidas (com multa e juros) são trocadas por um novo calendário,
 * com desconto e entrada opcionais. As originais ficam "renegociadas" (saem da inadimplência, mas o histórico fica).
 */
export async function criarAcordo(contratoId: string, fd: FormData) {
  const user = await requireUser("baixar");
  const volta = (t: string) => redirect(msg(`/contratos/${contratoId}`, "erro", t));

  const ids = [...new Set(fd.getAll("parcelaIds").map(String))];
  const desconto = String(fd.get("desconto") ?? "").trim() ? parseMoney(fd.get("desconto")) : 0;
  const entrada = String(fd.get("entrada") ?? "").trim() ? parseMoney(fd.get("entrada")) : 0;
  const entradaData = data(fd, "entradaData") ?? hoje();
  const n = inteiro(fd, "numParcelas");
  const primeiro = data(fd, "primeiroVenc");
  if (!ids.length) volta("Escolha ao menos uma parcela vencida para renegociar.");
  if (Number.isNaN(desconto) || desconto < 0 || Number.isNaN(entrada) || entrada < 0) volta("Desconto e entrada devem ser valores válidos.");

  const h = hoje();
  const [contrato, regras] = await Promise.all([
    prisma.contrato.findUnique({ where: { id: contratoId }, include: { parcelas: true } }),
    getConfig().then(regrasDe),
  ]);
  if (!contrato || contrato.status !== "ATIVO") volta("Só é possível negociar em contratos ativos.");

  const alvo = contrato!.parcelas.filter((p) => ids.includes(p.id));
  if (alvo.length !== ids.length || alvo.some((p) => p.pagoEm || p.renegociadaEm || p.vencimento >= h)) {
    volta("Só parcelas vencidas, não pagas e ainda não renegociadas podem entrar no acordo.");
  }

  const totalOriginal = alvo.reduce((s, p) => s + calcularEncargos(Number(p.valor), p.vencimento, regras, h).total, 0);
  const totalOriginalC = centavos(totalOriginal);
  const descontoC = centavos(desconto);
  const entradaC = centavos(entrada);
  const acordadoC = totalOriginalC - descontoC;
  if (acordadoC <= 0) volta("O desconto não pode ser igual ou maior que o total da dívida.");
  if (entradaC > acordadoC) volta("A entrada não pode ser maior que o total acordado.");
  const saldoC = acordadoC - entradaC;
  if (saldoC > 0 && (!Number.isInteger(n) || n < 1 || n > 60 || !primeiro)) volta("Informe de 1 a 60 parcelas e a data da primeira.");

  // Divide o saldo em N parcelas iguais; a última absorve os centavos que sobram.
  const parcelas: { vencimento: Date; centavos: number; obs: string }[] = [];
  if (entradaC > 0) parcelas.push({ vencimento: entradaData, centavos: entradaC, obs: "Entrada do acordo" });
  if (saldoC > 0) {
    const base = Math.floor(saldoC / n);
    for (let i = 0; i < n; i++) {
      parcelas.push({ vencimento: addMeses(primeiro!, i), centavos: i === n - 1 ? saldoC - base * (n - 1) : base, obs: `Acordo · parcela ${i + 1}/${n}` });
    }
  }

  const acordo = await prisma.$transaction(async (tx) => {
    const a = await tx.acordo.create({
      data: {
        contratoId,
        totalOriginal: totalOriginalC / 100,
        desconto: descontoC / 100,
        totalAcordado: acordadoC / 100,
        entrada: entradaC / 100,
        parcelas: saldoC > 0 ? n : 0,
        primeiroVenc: saldoC > 0 ? primeiro! : entradaData,
        observacoes: texto(fd, "observacoes"),
        usuarioNome: user.nome,
      },
    });
    await tx.parcela.updateMany({ where: { id: { in: ids } }, data: { renegociadaEm: h, renegociadaNoId: a.id } });
    let provisorio = 2_000_000;
    for (const p of parcelas) {
      await tx.parcela.create({
        data: { contratoId, numero: provisorio++, vencimento: p.vencimento, valor: p.centavos / 100, acordoId: a.id, observacoes: p.obs },
      });
    }
    await renumerarParcelas(tx, contratoId);
    return a;
  });
  await registrar(user, "fez acordo", "Contrato", contratoId, `Acordo #${acordo.numero}: ${acordadoC / 100} em ${parcelas.length} parcela(s)`);
  revalidatePath("/", "layout");
  redirect(msg(`/acordos/${acordo.id}`, "ok", "Acordo criado. As parcelas vencidas foram renegociadas."));
}
