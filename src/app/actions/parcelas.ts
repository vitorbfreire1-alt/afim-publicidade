"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormaPagamento } from "@prisma/client";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { renumerarParcelas } from "@/lib/contrato";
import { addMeses } from "@/lib/financeiro";
import { data, inteiro, texto } from "@/lib/form";
import { addDias, hoje, money, parseMoney } from "@/lib/format";
import { CUSTO_ITENS, CUSTO_LABEL, FORMAS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export async function receberParcela(id: string, volta: string, fd: FormData) {
  const user = await requireUser("baixar");
  const parcela = await prisma.parcela.findUniqueOrThrow({ where: { id } });

  const pagoEm = data(fd, "pagoEm");
  const valorPago = parseMoney(fd.get("valorPago"));
  const forma = String(fd.get("formaRecebida") ?? "") as FormaPagamento;
  if (!pagoEm || !(valorPago > 0) || !FORMAS.includes(forma)) {
    redirect(msg(volta, "erro", "Informe a data, o valor e a forma de recebimento."));
  }

  await prisma.parcela.update({ where: { id }, data: { pagoEm, valorPago, formaRecebida: forma } });
  await registrar(user, "recebeu", "Parcela", id, `Parcela ${parcela.numero}: ${valorPago}`);
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", `Parcela ${parcela.numero} registrada como recebida.`));
}

export async function desfazerRecebimento(id: string, volta: string) {
  const user = await requireUser("baixar");
  await prisma.parcela.update({ where: { id }, data: { pagoEm: null, valorPago: null, formaRecebida: null } });
  await registrar(user, "desfez recebimento", "Parcela", id, "");
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", "Recebimento desfeito."));
}

/** Acrescenta uma parcela avulsa ao contrato. */
export async function adicionarParcela(contratoId: string, fd: FormData) {
  const user = await requireUser("baixar");
  const volta = (tipo: "erro" | "ok", t: string) => redirect(msg(`/contratos/${contratoId}`, tipo, t));
  const valor = parseMoney(fd.get("valor"));
  const vencimento = data(fd, "vencimento");
  if (!(valor > 0) || !vencimento) volta("erro", "Informe um valor e uma data de vencimento válidos.");
  if (!(await prisma.contrato.findUnique({ where: { id: contratoId } }))) volta("erro", "Contrato não encontrado.");

  await prisma.$transaction(async (tx) => {
    await tx.parcela.create({ data: { contratoId, numero: 2_000_000, vencimento: vencimento!, valor, observacoes: texto(fd, "observacoes") } });
    await renumerarParcelas(tx, contratoId);
  });
  await registrar(user, "adicionou parcela", "Contrato", contratoId, `${valor} em ${vencimento!.toISOString().slice(0, 10)}`);
  revalidatePath("/", "layout");
  volta("ok", "Parcela adicionada.");
}

/** Exclui uma parcela em aberto (as já recebidas, renegociadas ou de acordo não podem ser excluídas aqui). */
export async function excluirParcela(id: string, volta: string) {
  const user = await requireUser("baixar");
  const p = await prisma.parcela.findUnique({ where: { id } });
  if (!p) redirect(msg(volta, "erro", "Parcela não encontrada."));
  if (p!.pagoEm) redirect(msg(volta, "erro", "Parcela já recebida: desfaça o recebimento antes de excluir."));
  if (p!.renegociadaEm || p!.acordoId) redirect(msg(volta, "erro", "Parcela ligada a um acordo não pode ser excluída aqui."));

  await prisma.$transaction(async (tx) => {
    await tx.parcela.delete({ where: { id } });
    await renumerarParcelas(tx, p!.contratoId);
  });
  await registrar(user, "excluiu parcela", "Parcela", id, `${Number(p!.valor)} com vencimento ${p!.vencimento.toISOString().slice(0, 10)}`);
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", "Parcela excluída."));
}

/**
 * Divide em mais (ou menos) vezes o que ainda falta pagar: as parcelas em aberto que ainda não venceram
 * viram N parcelas mensais de valores iguais, a partir da data escolhida. Parcelas pagas e vencidas não mudam.
 */
export async function reparcelarContrato(contratoId: string, fd: FormData) {
  const user = await requireUser("baixar");
  const volta = (tipo: "erro" | "ok", t: string) => redirect(msg(`/contratos/${contratoId}`, tipo, t));
  const n = inteiro(fd, "vezes");
  const primeiro = data(fd, "primeiro");
  const intervalo = intervaloDias(fd.get("intervalo")); // 0 = mensal
  if (!Number.isInteger(n) || n < 1 || n > 60) volta("erro", "Informe de 1 a 60 parcelas.");
  if (!primeiro) volta("erro", "Informe o vencimento da primeira nova parcela.");

  const h = hoje();
  const abertas = (await prisma.parcela.findMany({ where: { contratoId } })).filter(
    (p) => !p.pagoEm && !p.renegociadaEm && !p.acordoId && p.vencimento >= h,
  );
  if (!abertas.length) volta("erro", "Não há parcelas a vencer para dividir. Para dívidas já vencidas, use Negociar dívida.");

  const totalCentavos = abertas.reduce((s, p) => s + Math.round(Number(p.valor) * 100), 0);
  const base = Math.floor(totalCentavos / n);
  const resto = totalCentavos - base * n;

  await prisma.$transaction(async (tx) => {
    await tx.parcela.deleteMany({ where: { id: { in: abertas.map((p) => p.id) } } });
    for (let i = 0; i < n; i++) {
      await tx.parcela.create({
        data: {
          contratoId,
          numero: 2_000_000 + i,
          vencimento: intervalo ? addDias(primeiro!, i * intervalo) : addMeses(primeiro!, i, primeiro!.getUTCDate()),
          valor: (base + (i === n - 1 ? resto : 0)) / 100,
          observacoes: `Parcelamento refeito em ${n}x`,
        },
      });
    }
    await renumerarParcelas(tx, contratoId);
  });
  await registrar(user, "reparcelou", "Contrato", contratoId, `${abertas.length} parcela(s) a vencer (R$ ${(totalCentavos / 100).toFixed(2)}) em ${n}x${intervalo ? ` a cada ${intervalo} dias` : ""}`);
  revalidatePath("/", "layout");
  volta("ok", `${abertas.length} parcela(s) a vencer viraram ${n} parcela(s) de R$ ${(base / 100).toFixed(2).replace(".", ",")}${intervalo ? `, a cada ${intervalo} dias` : ""}.`);
}

/** Intervalo entre parcelas escolhido no formulário: "15" e "7" são dias; qualquer outra coisa vale "mensal" (0). */
function intervaloDias(v: FormDataEntryValue | null): number {
  const n = Number(v);
  return n === 15 || n === 7 ? n : 0;
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Troca uma parcela por `partes` parcelas de valores iguais, espaçadas de `intervalo` dias a partir do vencimento original. */
async function dividirEmPartes(tx: Tx, p: { id: string; contratoId: string; vencimento: Date; valor: unknown }, partes: number, intervalo: number) {
  const total = Math.round(Number(p.valor) * 100);
  const base = Math.floor(total / partes);
  const resto = total - base * partes;
  await tx.parcela.delete({ where: { id: p.id } });
  for (let j = 0; j < partes; j++) {
    await tx.parcela.create({
      data: {
        contratoId: p.contratoId,
        numero: 2_000_000 + j,
        vencimento: addDias(p.vencimento, j * intervalo),
        valor: (base + (j === partes - 1 ? resto : 0)) / 100,
        observacoes: `Dividida em ${partes} pagamentos`,
      },
    });
  }
}

const dividivel = (p: { pagoEm: Date | null; renegociadaEm: Date | null; acordoId: string | null }) => !p.pagoEm && !p.renegociadaEm && !p.acordoId;

/** Divide UMA parcela em vários pagamentos (ex.: R$ 1.000 vira 2 de R$ 500 a cada 15 dias). */
export async function dividirParcela(id: string, volta: string, fd: FormData) {
  const user = await requireUser("baixar");
  const partes = inteiro(fd, "partes");
  const intervalo = intervaloDias(fd.get("intervalo")) || 15;
  if (!Number.isInteger(partes) || partes < 2 || partes > 12) redirect(msg(volta, "erro", "Informe de 2 a 12 pagamentos."));
  const p = await prisma.parcela.findUnique({ where: { id } });
  if (!p) redirect(msg(volta, "erro", "Parcela não encontrada."));
  if (!dividivel(p!)) redirect(msg(volta, "erro", "Só dá para dividir parcelas em aberto e fora de acordo."));

  await prisma.$transaction(async (tx) => {
    await dividirEmPartes(tx, p!, partes, intervalo);
    await renumerarParcelas(tx, p!.contratoId);
  });
  await registrar(user, "dividiu parcela", "Parcela", id, `${Number(p!.valor)} em ${partes}x a cada ${intervalo} dias`);
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", `Parcela dividida em ${partes} pagamentos, a cada ${intervalo} dias.`));
}

/** Divide cada parcela em aberto que ainda vai vencer em vários pagamentos (ex.: mensalidade de R$ 1.000 em 2 de R$ 500 a cada 15 dias). */
export async function dividirParcelasDoContrato(contratoId: string, fd: FormData) {
  const user = await requireUser("baixar");
  const volta = (tipo: "erro" | "ok", t: string) => redirect(msg(`/contratos/${contratoId}`, tipo, t));
  const partes = inteiro(fd, "partes");
  const intervalo = intervaloDias(fd.get("intervalo")) || 15;
  if (!Number.isInteger(partes) || partes < 2 || partes > 12) volta("erro", "Informe de 2 a 12 pagamentos por parcela.");

  const h = hoje();
  const alvo = (await prisma.parcela.findMany({ where: { contratoId } })).filter((p) => dividivel(p) && p.vencimento >= h);
  if (!alvo.length) volta("erro", "Não há parcelas a vencer para dividir.");

  await prisma.$transaction(async (tx) => {
    for (const p of alvo) await dividirEmPartes(tx, p, partes, intervalo);
    await renumerarParcelas(tx, contratoId);
  });
  await registrar(user, "dividiu parcelas", "Contrato", contratoId, `${alvo.length} parcela(s) em ${partes}x a cada ${intervalo} dias`);
  revalidatePath("/", "layout");
  volta("ok", `${alvo.length} parcela(s) divididas em ${partes} pagamentos cada, a cada ${intervalo} dias.`);
}

/**
 * Cobra serviços de produção à parte (ex.: colagem quando o cliente troca a arte) como uma parcela avulsa.
 * Os campos vêm por ponto e serviço: `cobrar_{pontoId}_{ITEM}` (marcado), `cqtd_...` (quantidade) e `cval_...` (valor unitário).
 */
export async function cobrarProducao(contratoId: string, fd: FormData) {
  const user = await requireUser("baixar");
  const volta = (tipo: "erro" | "ok", t: string) => redirect(msg(`/contratos/${contratoId}`, tipo, t));
  const vencimento = data(fd, "vencimento");
  if (!vencimento) volta("erro", "Informe o vencimento da cobrança.");
  const motivo = texto(fd, "motivo") ?? "Troca de arte";

  const contrato = await prisma.contrato.findUnique({ where: { id: contratoId }, include: { pontos: { include: { ponto: true } } } });
  if (!contrato) volta("erro", "Contrato não encontrado.");

  const linhas: string[] = [];
  let centavos = 0;
  for (const cp of contrato!.pontos) {
    for (const item of CUSTO_ITENS) {
      if (fd.get(`cobrar_${cp.pontoId}_${item}`) !== "on") continue;
      const qtd = inteiro(fd, `cqtd_${cp.pontoId}_${item}`) || 1;
      const unit = parseMoney(fd.get(`cval_${cp.pontoId}_${item}`));
      if (!Number.isInteger(qtd) || qtd < 1 || qtd > 99 || !(unit >= 0)) volta("erro", `Confira a quantidade e o valor de ${CUSTO_LABEL[item]} em ${cp.ponto.nome}.`);
      centavos += Math.round(qtd * unit * 100);
      linhas.push(`${CUSTO_LABEL[item]} · ${cp.ponto.nome}: ${qtd} × ${money(unit)}`);
    }
  }
  if (!linhas.length || centavos <= 0) volta("erro", "Marque ao menos um serviço com valor maior que zero.");

  await prisma.$transaction(async (tx) => {
    await tx.parcela.create({ data: { contratoId, numero: 2_000_000, vencimento: vencimento!, valor: centavos / 100, observacoes: `${motivo}: ${linhas.join("; ")}` } });
    await renumerarParcelas(tx, contratoId);
  });
  await registrar(user, "cobrou produção", "Contrato", contratoId, `${motivo}: ${money(centavos / 100)}`);
  revalidatePath("/", "layout");
  volta("ok", `Cobrança de produção de ${money(centavos / 100)} lançada (${motivo}).`);
}
