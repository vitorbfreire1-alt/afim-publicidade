"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormaPagamento } from "@prisma/client";
import { msg } from "@/components/Flash";
import { registrar } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { choqueComRecebida, parcelaDoMes, recalcularPeriodo, renumerarParcelas, somarParcelas } from "@/lib/contrato";
import { janelaDeRenovacao, verificarCotas } from "@/lib/cotas";
import { addMeses, agregarParcelas, calcularFim, gerarParcelas } from "@/lib/financeiro";
import { data, inteiro, texto } from "@/lib/form";
import { dateBR, hoje, money, parseMoney } from "@/lib/format";
import { CUSTO_ITENS, CUSTO_LABEL, FORMAS_CONTRATO } from "@/lib/labels";
import { MAX_PRAZO, calcularPrazo, unidadeDe } from "@/lib/prazo";
import { prisma } from "@/lib/prisma";

export async function criarContrato(fd: FormData) {
  const user = await requireUser("editar", "valores");
  const volta = (t: string) => redirect(msg("/contratos/novo", "erro", t));

  const clienteId = String(fd.get("clienteId") ?? "");
  const pontoIds = [...new Set(fd.getAll("pontoIds").map(String))];
  const forma = String(fd.get("formaPagamento") ?? "") as FormaPagamento;
  const diaVencimento = inteiro(fd, "diaVencimento");
  const vendedorId = texto(fd, "vendedorId");
  const comissaoBruta = String(fd.get("comissaoPct") ?? "").trim();
  const comissaoPct = comissaoBruta ? Number(comissaoBruta.replace(",", ".")) : null;
  const propostaId = texto(fd, "propostaId");
  if (comissaoPct !== null && !(comissaoPct >= 0 && comissaoPct <= 100)) volta("A comissão deve estar entre 0 e 100%.");

  if (!clienteId) volta("Escolha o cliente.");
  if (!pontoIds.length) volta("Escolha ao menos um ponto.");
  if (!FORMAS_CONTRATO.includes(forma)) volta("Escolha a forma de pagamento.");
  if (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 28) {
    volta("O dia de vencimento deve ser de 1 a 28.");
  }

  // Cada ponto traz o seu valor mensal, início e prazo.
  const itens = pontoIds.map((pontoId) => ({
    pontoId,
    valor: parseMoney(fd.get(`valor_${pontoId}`)),
    inicio: data(fd, `inicio_${pontoId}`),
    quantidade: inteiro(fd, `prazo_${pontoId}`),
    unidade: unidadeDe(fd.get(`unidade_${pontoId}`)),
    ocupaTudo: fd.get(`inteiro_${pontoId}`) === "on",
    cotasUsadas: Math.max(1, inteiro(fd, `cotas_${pontoId}`) || 1),
  }));
  for (const it of itens) {
    if (!(it.valor > 0)) volta("Informe o valor mensal de cada ponto escolhido.");
    if (!it.inicio) volta("Informe a data de início de cada ponto escolhido.");
    if (!Number.isInteger(it.quantidade) || it.quantidade < 1 || it.quantidade > MAX_PRAZO[it.unidade]) {
      volta(it.unidade === "bisemanas" ? "O prazo de cada ponto deve ser de 1 a 260 bi-semanas." : "O prazo de cada ponto deve ser de 1 a 120 meses.");
    }
  }

  const [cliente, pontos] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId } }),
    prisma.ponto.findMany({ where: { id: { in: pontoIds }, ativo: true } }),
  ]);
  if (!cliente?.ativo) volta("Cliente inválido ou desativado.");
  if (pontos.length !== pontoIds.length) volta("Algum ponto escolhido não existe ou está desativado.");
  for (const it of itens) {
    const cotas = pontos.find((p) => p.id === it.pontoId)?.cotas;
    if (cotas && it.cotasUsadas > cotas) volta("O contrato não pode ocupar mais cotas do que o ponto tem.");
  }

  const comFim = itens.map((it) => {
    const prazo = calcularPrazo(it.inicio!, it.quantidade, it.unidade, it.valor);
    return {
      pontoId: it.pontoId,
      valor: prazo.valorMensal,
      inicio: it.inicio!,
      prazoMeses: prazo.prazoMeses,
      fim: prazo.fim,
      ocupaTudo: it.ocupaTudo,
      cotasUsadas: it.cotasUsadas,
    };
  });
  const time = (d: Date) => d.getTime();

  // Serviços de produção marcados (impressão, lona, colagem...): somados à 1ª parcela do contrato.
  const producao: { texto: string; total: number }[] = [];
  if (forma !== "PERMUTA") {
    for (const p of pontos) {
      for (const item of CUSTO_ITENS) {
        if (fd.get(`prod_${p.id}_${item}`) !== "on") continue;
        const qtd = inteiro(fd, `prodqtd_${p.id}_${item}`) || 1;
        const unit = parseMoney(fd.get(`prodval_${p.id}_${item}`));
        if (!Number.isInteger(qtd) || qtd < 1 || qtd > 99 || !(unit >= 0)) volta(`Confira a quantidade e o valor de ${CUSTO_LABEL[item]} em ${p.nome}.`);
        producao.push({ texto: `${CUSTO_LABEL[item]} · ${p.nome}: ${qtd} × ${money(unit)}`, total: Math.round(qtd * unit * 100) / 100 });
      }
    }
  }
  const totalProducao = Math.round(producao.reduce((s, x) => s + x.total, 0) * 100) / 100;
  const parcelasContrato = forma === "PERMUTA" ? [] : agregarParcelas(comFim, diaVencimento);
  const notaProducao = producao.length ? `Produção cobrada na 1ª parcela (${money(totalProducao)}): ${producao.map((x) => x.texto).join("; ")}.` : "";
  if (producao.length && parcelasContrato.length) parcelasContrato[0] = { ...parcelasContrato[0], valor: Math.round((parcelasContrato[0].valor + totalProducao) * 100) / 100 };

  const lotado = await verificarCotas(comFim);
  if (lotado) volta(lotado);

  const contrato = await prisma.contrato.create({
    data: {
      clienteId,
      formaPagamento: forma,
      diaVencimento,
      inicio: new Date(Math.min(...comFim.map((i) => time(i.inicio)))),
      fim: new Date(Math.max(...comFim.map((i) => time(i.fim)))),
      observacoes: [texto(fd, "observacoes"), notaProducao].filter(Boolean).join("\n") || null,
      vendedorId,
      comissaoPct: vendedorId ? comissaoPct : null,
      pontos: { create: comFim },
      permutaDescricao: forma === "PERMUTA" ? texto(fd, "permutaDescricao") : null,
      // Permuta não gera parcelas a receber.
      parcelas: { create: parcelasContrato.map((x, i) => (i === 0 && producao.length ? { ...x, observacoes: `Inclui produção: ${money(totalProducao)}` } : x)) },
    },
  });
  if (propostaId) {
    await prisma.proposta.updateMany({ where: { id: propostaId, contratoId: null }, data: { status: "FECHADA", contratoId: contrato.id } });
  }
  await registrar(user, "criou", "Contrato", contrato.id, `Contrato #${contrato.numero} de ${cliente!.nome}`);
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${contrato.id}`, "ok", forma === "PERMUTA" ? "Contrato de permuta criado (sem parcelas a receber)." : "Contrato criado e parcelas geradas."));
}

/** `volta` é a página para onde retornar (só caminhos internos); por padrão, o próprio contrato. */
export async function mudarStatusContrato(id: string, status: "ATIVO" | "ENCERRADO" | "CANCELADO", volta?: string) {
  const user = await requireUser("editar");
  await prisma.contrato.update({ where: { id }, data: { status } });
  await registrar(user, status === "ATIVO" ? "reativou" : status === "ENCERRADO" ? "encerrou" : "cancelou", "Contrato", id, `Contrato ${id.slice(-6)}`);
  revalidatePath("/", "layout");
  const destino = volta && /^\/(?!\/)/.test(volta) ? volta : `/contratos/${id}`;
  redirect(msg(destino, "ok", status === "ATIVO" ? "Contrato reativado." : status === "ENCERRADO" ? "Contrato encerrado." : "Contrato cancelado."));
}

/** Adiciona um ponto a um contrato ativo, com valor, início e prazo próprios. */
export async function adicionarPonto(contratoId: string, fd: FormData) {
  const user = await requireUser("editar", "valores");
  const volta = (t: string) => redirect(msg(`/contratos/${contratoId}`, "erro", t));

  const pontoId = String(fd.get("pontoId") ?? "");
  const valor = parseMoney(fd.get("valor"));
  const inicio = data(fd, "inicio");
  const quantidade = inteiro(fd, "prazoMeses");
  const unidade = unidadeDe(fd.get("unidade"));
  const ocupaTudo = fd.get("ocupaTudo") === "on";
  const cotasUsadas = Math.max(1, inteiro(fd, "cotasUsadas") || 1);
  if (!pontoId) volta("Escolha o ponto.");
  if (!(valor > 0)) volta("Informe o valor mensal do ponto.");
  if (!inicio) volta("Informe a data de início.");
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_PRAZO[unidade]) volta(unidade === "bisemanas" ? "O prazo deve ser de 1 a 260 bi-semanas." : "O prazo deve ser de 1 a 120 meses.");
  const { prazoMeses, fim: fimPonto, valorMensal } = calcularPrazo(inicio!, quantidade, unidade, valor);

  const [contrato, ponto] = await Promise.all([
    prisma.contrato.findUnique({ where: { id: contratoId }, include: { pontos: true, parcelas: true } }),
    prisma.ponto.findUnique({ where: { id: pontoId } }),
  ]);
  if (!contrato || contrato.status !== "ATIVO") volta("Só é possível alterar contratos ativos.");
  if (!ponto?.ativo) volta("Ponto inválido ou desativado.");
  if (contrato!.pontos.some((p) => p.pontoId === pontoId)) volta("Esse ponto já está no contrato. Use Renovar para estender o prazo.");

  const novas = gerarParcelas(inicio!, prazoMeses, contrato!.diaVencimento, valorMensal);
  const lotado = await verificarCotas([{ pontoId, inicio: inicio!, fim: fimPonto, ocupaTudo, cotasUsadas }], contratoId);
  if (lotado) volta(lotado);
  const choque = choqueComRecebida(novas, contrato!.parcelas);
  if (choque) volta(`O ponto começaria cobrando em ${dateBR(choque.vencimento)}, mês que já foi recebido. Escolha um início posterior.`);

  await prisma.$transaction(async (tx) => {
    await tx.contratoPonto.create({
      data: { contratoId, pontoId, valor: valorMensal, inicio: inicio!, prazoMeses, fim: fimPonto, ocupaTudo, cotasUsadas },
    });
    await somarParcelas(tx, contratoId, novas);
    await recalcularPeriodo(tx, contratoId);
  });
  await registrar(user, "adicionou ponto", "Contrato", contratoId, ponto!.nome);
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${contratoId}`, "ok", "Ponto adicionado e parcelas atualizadas."));
}

/** Estende o prazo de um ponto do contrato (renovação), opcionalmente com um novo valor mensal. */
export async function renovarPonto(contratoId: string, pontoId: string, fd: FormData) {
  const user = await requireUser("editar", "valores");
  const volta = (t: string) => redirect(msg(`/contratos/${contratoId}`, "erro", t));

  const meses = inteiro(fd, "meses");
  const novoValorBruto = String(fd.get("valor") ?? "").trim();
  const novoValor = novoValorBruto ? parseMoney(fd.get("valor")) : null;
  if (!Number.isInteger(meses) || meses < 1 || meses > 120) volta("Informe de 1 a 120 meses de renovação.");
  if (novoValor !== null && !(novoValor > 0)) volta("O novo valor mensal é inválido.");

  const cp = await prisma.contratoPonto.findUnique({
    where: { contratoId_pontoId: { contratoId, pontoId } },
    include: { contrato: { include: { parcelas: true } } },
  });
  if (!cp || cp.contrato.status !== "ATIVO") volta("Só é possível alterar contratos ativos.");

  const valor = novoValor ?? Number(cp!.valor);
  const prazoNovo = cp!.prazoMeses + meses;
  if (prazoNovo > 240) volta("O prazo total ficaria longo demais.");
  // Só as cobranças dos meses acrescentados entram no calendário.
  const acrescimo = gerarParcelas(cp!.inicio, prazoNovo, cp!.contrato.diaVencimento, valor).slice(cp!.prazoMeses);
  const janela = janelaDeRenovacao(cp!.fim, calcularFim(cp!.inicio, prazoNovo));
  const lotado = await verificarCotas([{ pontoId, ...janela, ocupaTudo: cp!.ocupaTudo, cotasUsadas: cp!.cotasUsadas }], contratoId);
  if (lotado) volta(lotado);
  const choque = choqueComRecebida(acrescimo, cp!.contrato.parcelas);
  if (choque) volta(`A renovação cobraria em ${dateBR(choque.vencimento)}, mês que já foi recebido.`);

  await prisma.$transaction(async (tx) => {
    await tx.contratoPonto.update({
      where: { contratoId_pontoId: { contratoId, pontoId } },
      data: { prazoMeses: prazoNovo, fim: calcularFim(cp!.inicio, prazoNovo), valor, renovacao: "A_CONTATAR" },
    });
    await somarParcelas(tx, contratoId, acrescimo);
    await recalcularPeriodo(tx, contratoId);
  });
  await registrar(user, "renovou ponto", "Contrato", contratoId, `+${meses} meses${novoValor ? ` a ${novoValor}` : ""}`);
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${contratoId}`, "ok", `Ponto renovado por mais ${meses} meses.`));
}

const INDICES = ["IGP-M", "IPCA", "Acordo", "Outro"];

/** Aplica um reajuste percentual às parcelas futuras não pagas e aos valores dos pontos ainda vigentes. */
export async function aplicarReajuste(contratoId: string, fd: FormData) {
  const user = await requireUser("editar", "valores");
  const volta = (t: string) => redirect(msg(`/contratos/${contratoId}`, "erro", t));

  const percentual = Number(String(fd.get("percentual") ?? "").replace(",", "."));
  const indice = String(fd.get("indice") ?? "");
  if (!(percentual > -50 && percentual < 100) || percentual === 0 || Number.isNaN(percentual)) volta("Informe um percentual válido (ex.: 4,5).");
  if (!INDICES.includes(indice)) volta("Escolha o índice.");

  const contrato = await prisma.contrato.findUnique({ where: { id: contratoId }, include: { pontos: true } });
  if (!contrato || contrato.status !== "ATIVO") volta("Só é possível reajustar contratos ativos.");

  const h = hoje();
  const fator = 1 + percentual / 100;
  const futuras = await prisma.parcela.findMany({ where: { contratoId, pagoEm: null, renegociadaEm: null, vencimento: { gte: h } } });
  if (!futuras.length) volta("Não há parcelas futuras para reajustar.");

  await prisma.$transaction(async (tx) => {
    for (const p of futuras) {
      await tx.parcela.update({ where: { id: p.id }, data: { valor: Math.round(Number(p.valor) * fator * 100) / 100 } });
    }
    for (const cp of contrato!.pontos.filter((x) => x.fim >= h)) {
      await tx.contratoPonto.update({
        where: { contratoId_pontoId: { contratoId, pontoId: cp.pontoId } },
        data: { valor: Math.round(Number(cp.valor) * fator * 100) / 100 },
      });
    }
    await tx.reajuste.create({
      data: { contratoId, percentual, indice, aplicadoEm: h, observacoes: texto(fd, "observacoes"), usuarioNome: user.nome },
    });
  });
  await registrar(user, "reajustou", "Contrato", contratoId, `${indice} ${percentual}% em ${futuras.length} parcela(s)`);
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${contratoId}`, "ok", `Reajuste de ${percentual}% aplicado em ${futuras.length} parcela(s) futura(s).`));
}

// ---------------------------------------------------------------------------------------------------------------------
// Edição de contratos já criados
// ---------------------------------------------------------------------------------------------------------------------

const arred = (n: number) => Math.round(n * 100) / 100;

/** Dados gerais: forma de pagamento, dia de vencimento (move as parcelas ainda não pagas), vendedor, comissão e observações. */
export async function editarContrato(id: string, fd: FormData) {
  const user = await requireUser("editar", "valores");
  const volta = (t: string) => redirect(msg(`/contratos/${id}`, "erro", t));

  const forma = String(fd.get("formaPagamento") ?? "") as FormaPagamento;
  const dia = inteiro(fd, "diaVencimento");
  const vendedorId = texto(fd, "vendedorId");
  const comissaoBruta = String(fd.get("comissaoPct") ?? "").trim();
  const comissaoPct = comissaoBruta ? Number(comissaoBruta.replace(",", ".")) : null;
  if (!FORMAS_CONTRATO.includes(forma)) volta("Escolha a forma de pagamento.");
  if (!Number.isInteger(dia) || dia < 1 || dia > 28) volta("O dia de vencimento deve ser de 1 a 28.");
  if (comissaoPct !== null && !(comissaoPct >= 0 && comissaoPct <= 100)) volta("A comissão deve estar entre 0 e 100%.");

  const contrato = await prisma.contrato.findUnique({ where: { id }, include: { parcelas: true } });
  if (!contrato) volta("Contrato não encontrado.");
  if ((forma === "PERMUTA") !== (contrato!.formaPagamento === "PERMUTA")) {
    volta("Não dá para trocar entre permuta e pagamento em dinheiro num contrato já criado. Encerre este e crie um novo.");
  }

  await prisma.$transaction(async (tx) => {
    if (dia !== contrato!.diaVencimento) {
      // Só parcelas normais e ainda não pagas mudam de dia (acordos e parcelas pagas ficam como estão).
      for (const p of contrato!.parcelas.filter((x) => !x.pagoEm && !x.renegociadaEm && !x.acordoId)) {
        await tx.parcela.update({ where: { id: p.id }, data: { vencimento: addMeses(p.vencimento, 0, dia) } });
      }
      await renumerarParcelas(tx, id);
    }
    await tx.contrato.update({
      where: { id },
      data: { formaPagamento: forma, permutaDescricao: forma === "PERMUTA" ? texto(fd, "permutaDescricao") : null, diaVencimento: dia, vendedorId, comissaoPct: vendedorId ? comissaoPct : null, observacoes: texto(fd, "observacoes") },
    });
  });
  await registrar(user, "editou", "Contrato", id, `Contrato #${contrato!.numero}${dia !== contrato!.diaVencimento ? ` (vencimento dia ${dia})` : ""}`);
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${id}`, "ok", "Contrato atualizado."));
}

/** Novo valor mensal de um ponto, a partir de hoje: ajusta as parcelas futuras não pagas na diferença. */
export async function alterarValorPonto(contratoId: string, pontoId: string, fd: FormData) {
  const user = await requireUser("editar", "valores");
  const volta = (t: string) => redirect(msg(`/contratos/${contratoId}`, "erro", t));
  const novo = parseMoney(fd.get("valor"));
  if (!(novo > 0)) volta("Informe o novo valor mensal.");

  const cp = await prisma.contratoPonto.findUnique({
    where: { contratoId_pontoId: { contratoId, pontoId } },
    include: { contrato: { include: { parcelas: true } } },
  });
  if (!cp || cp.contrato.status !== "ATIVO") volta("Só é possível alterar contratos ativos.");
  const delta = arred(novo - Number(cp!.valor));
  if (delta === 0) volta("O valor informado é igual ao atual.");

  const h = hoje();
  const meses = gerarParcelas(cp!.inicio, cp!.prazoMeses, cp!.contrato.diaVencimento, 0).filter((x) => x.vencimento >= h);
  let alteradas = 0;
  await prisma.$transaction(async (tx) => {
    for (const m of meses) {
      const p = parcelaDoMes(cp!.contrato.parcelas, m.vencimento);
      if (!p || p.pagoEm || arred(Number(p.valor) + delta) <= 0) continue;
      await tx.parcela.update({ where: { id: p.id }, data: { valor: arred(Number(p.valor) + delta) } });
      alteradas++;
    }
    await tx.contratoPonto.update({ where: { contratoId_pontoId: { contratoId, pontoId } }, data: { valor: novo } });
  });
  await registrar(user, "alterou valor do ponto", "Contrato", contratoId, `${Number(cp!.valor)} → ${novo} em ${alteradas} parcela(s)`);
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${contratoId}`, "ok", `Valor alterado em ${alteradas} parcela(s) futura(s).`));
}

/**
 * Encerra um ponto numa data: as parcelas dele depois dessa data são retiradas (as já pagas ficam).
 * Para "trocar" um ponto, encerre o antigo e adicione o novo.
 */
export async function encerrarPonto(contratoId: string, pontoId: string, fd: FormData) {
  const user = await requireUser("editar", "valores");
  const volta = (t: string) => redirect(msg(`/contratos/${contratoId}`, "erro", t));
  const corte = data(fd, "data");
  if (!corte) volta("Informe a data de encerramento.");

  const cp = await prisma.contratoPonto.findUnique({
    where: { contratoId_pontoId: { contratoId, pontoId } },
    include: { ponto: true, contrato: { include: { parcelas: true, pontos: true } } },
  });
  if (!cp || cp.contrato.status !== "ATIVO") volta("Só é possível alterar contratos ativos.");
  if (cp!.contrato.pontos.length < 2) volta("Este é o único ponto do contrato. Para terminar tudo, use Encerrar contrato.");

  const todas = gerarParcelas(cp!.inicio, cp!.prazoMeses, cp!.contrato.diaVencimento, Number(cp!.valor));
  const ficam = todas.filter((x) => x.vencimento <= corte!);
  const saem = todas.filter((x) => x.vencimento > corte!);
  if (!saem.length) volta("Essa data é igual ou posterior ao fim do ponto; não há nada a retirar.");

  let mantidas = 0;
  await prisma.$transaction(async (tx) => {
    for (const m of saem) {
      const p = parcelaDoMes(cp!.contrato.parcelas, m.vencimento);
      if (!p) continue;
      if (p.pagoEm) { mantidas++; continue; } // já recebida: não mexe
      const resto = arred(Number(p.valor) - Number(cp!.valor));
      if (resto <= 0.009) await tx.parcela.delete({ where: { id: p.id } });
      else await tx.parcela.update({ where: { id: p.id }, data: { valor: resto } });
    }
    if (!ficam.length) {
      await tx.contratoPonto.delete({ where: { contratoId_pontoId: { contratoId, pontoId } } });
    } else {
      await tx.contratoPonto.update({
        where: { contratoId_pontoId: { contratoId, pontoId } },
        data: { prazoMeses: ficam.length, fim: calcularFim(cp!.inicio, ficam.length) },
      });
    }
    await renumerarParcelas(tx, contratoId);
    await recalcularPeriodo(tx, contratoId);
  });
  await registrar(user, "encerrou ponto", "Contrato", contratoId, `${cp!.ponto.nome} em ${dateBR(corte!)}`);
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${contratoId}`, "ok", `Ponto encerrado. ${saem.length - mantidas} parcela(s) ajustada(s)${mantidas ? `; ${mantidas} já paga(s) foram mantidas` : ""}.`));
}

/** Ajusta uma parcela ainda em aberto (valor, vencimento, motivo): descontos, prorrogações. */
export async function editarParcela(id: string, volta: string, fd: FormData) {
  const user = await requireUser("baixar");
  const valor = parseMoney(fd.get("valor"));
  const vencimento = data(fd, "vencimento");
  if (!(valor > 0) || !vencimento) redirect(msg(volta, "erro", "Informe um valor e uma data de vencimento válidos."));

  const p = await prisma.parcela.findUnique({ where: { id } });
  if (!p) redirect(msg(volta, "erro", "Parcela não encontrada."));
  if (p!.pagoEm || p!.renegociadaEm) redirect(msg(volta, "erro", "Só dá para editar parcelas em aberto. Se já foi recebida, desfaça o recebimento primeiro."));

  await prisma.$transaction(async (tx) => {
    await tx.parcela.update({ where: { id }, data: { valor, vencimento, observacoes: texto(fd, "observacoes") } });
    await renumerarParcelas(tx, p!.contratoId);
  });
  await registrar(user, "editou parcela", "Parcela", id, `${Number(p!.valor)} → ${valor}; vence ${dateBR(vencimento)}`);
  revalidatePath("/", "layout");
  redirect(msg(volta, "ok", "Parcela atualizada."));
}

/**
 * "Começar a controlar a partir de": tira do controle as parcelas com vencimento anterior à data (ex.: meses da gestão antiga).
 * O contrato, os pontos e as datas de veiculação continuam como estão; só as parcelas anteriores saem da cobrança.
 */
export async function comecarControleEm(contratoId: string, fd: FormData) {
  const user = await requireUser("editar", "valores");
  const volta = (tipo: "erro" | "ok", t: string) => redirect(msg(`/contratos/${contratoId}`, tipo, t));
  const corte = data(fd, "corte");
  if (!corte) volta("erro", "Informe a data a partir da qual o sistema passa a controlar este contrato.");

  const parcelas = await prisma.parcela.findMany({ where: { contratoId } });
  const saem = parcelas.filter((p) => p.vencimento < corte! && !p.acordoId);
  if (!saem.length) volta("erro", "Não há parcelas anteriores a essa data.");
  if (saem.length === parcelas.length) volta("erro", "Isso removeria todas as parcelas do contrato. Escolha uma data anterior ao último vencimento.");
  if (parcelas.some((p) => p.acordoId && p.vencimento < corte!)) volta("erro", "Há parcelas de acordo anteriores a essa data; escolha uma data posterior a elas ou desfaça o acordo.");

  await prisma.$transaction(async (tx) => {
    await tx.parcela.deleteMany({ where: { id: { in: saem.map((p) => p.id) } } });
    await renumerarParcelas(tx, contratoId);
  });
  await registrar(user, "iniciou controle em", "Contrato", contratoId, `${dateBR(corte!)}: ${saem.length} parcela(s) anteriores retiradas`);
  revalidatePath("/", "layout");
  volta("ok", `${saem.length} parcela(s) anteriores a ${dateBR(corte!)} foram retiradas. O sistema passa a controlar o contrato a partir dessa data.`);
}

/**
 * Corrige as datas de veiculação de um ponto do contrato (início e fim).
 * As parcelas não mudam: valor e vencimento continuam como estão (use "Editar parcela" para ajustá-las).
 */
export async function alterarDatasPonto(contratoId: string, pontoId: string, fd: FormData) {
  const user = await requireUser("editar", "valores");
  const volta = (t: string) => redirect(msg(`/contratos/${contratoId}`, "erro", t));
  const inicio = data(fd, "inicio");
  const fim = data(fd, "fim");
  if (!inicio || !fim) volta("Informe a data de início e a de fim.");
  if (fim! < inicio!) volta("A data de fim não pode ser anterior à de início.");

  const cp = await prisma.contratoPonto.findUnique({
    where: { contratoId_pontoId: { contratoId, pontoId } },
    include: { ponto: true, contrato: true },
  });
  if (!cp || cp.contrato.status !== "ATIVO") volta("Só é possível alterar contratos ativos.");
  if (inicio!.getTime() === cp!.inicio.getTime() && fim!.getTime() === cp!.fim.getTime()) volta("As datas informadas são iguais às atuais.");

  const lotado = await verificarCotas([{ pontoId, inicio: inicio!, fim: fim!, ocupaTudo: cp!.ocupaTudo, cotasUsadas: cp!.cotasUsadas }], contratoId);
  if (lotado) volta(lotado);

  const prazoMeses = Math.max(1, Math.round(((fim!.getTime() - inicio!.getTime()) / 86_400_000 + 1) / 30.4));
  await prisma.$transaction(async (tx) => {
    await tx.contratoPonto.update({ where: { contratoId_pontoId: { contratoId, pontoId } }, data: { inicio: inicio!, fim: fim!, prazoMeses } });
    await recalcularPeriodo(tx, contratoId);
  });
  await registrar(user, "alterou datas do ponto", "Contrato", contratoId, `${cp!.ponto.nome}: ${dateBR(cp!.inicio)}–${dateBR(cp!.fim)} → ${dateBR(inicio!)}–${dateBR(fim!)}`);
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${contratoId}`, "ok", "Datas do ponto atualizadas. As parcelas não foram alteradas."));
}

/** Troca o ponto de um contrato por outro (para corrigir um ponto cadastrado errado). Valor, datas e parcelas continuam iguais. */
export async function trocarPonto(contratoId: string, pontoId: string, fd: FormData) {
  const user = await requireUser("editar", "valores");
  const volta = (t: string) => redirect(msg(`/contratos/${contratoId}`, "erro", t));
  const novoId = String(fd.get("novoPontoId") ?? "");
  if (!novoId) volta("Escolha o ponto correto.");

  const [cp, novo, ja] = await Promise.all([
    prisma.contratoPonto.findUnique({ where: { contratoId_pontoId: { contratoId, pontoId } }, include: { ponto: true } }),
    prisma.ponto.findUnique({ where: { id: novoId } }),
    prisma.contratoPonto.findUnique({ where: { contratoId_pontoId: { contratoId, pontoId: novoId } } }),
  ]);
  if (!cp) volta("Ponto do contrato não encontrado.");
  if (!novo?.ativo) volta("O ponto escolhido não existe ou está desativado.");
  if (ja) volta("Esse ponto já está neste contrato.");

  const lotado = await verificarCotas([{ pontoId: novoId, inicio: cp!.inicio, fim: cp!.fim, ocupaTudo: cp!.ocupaTudo, cotasUsadas: cp!.cotasUsadas }], contratoId);
  if (lotado) volta(lotado);

  await prisma.contratoPonto.update({ where: { contratoId_pontoId: { contratoId, pontoId } }, data: { pontoId: novoId } });
  await registrar(user, "trocou ponto", "Contrato", contratoId, `${cp!.ponto.nome} → ${novo!.nome}`);
  revalidatePath("/", "layout");
  redirect(msg(`/contratos/${contratoId}`, "ok", `Ponto trocado: ${cp!.ponto.nome} → ${novo!.nome}.`));
}

/** Define quantas cotas do ponto o contrato ocupa: o ponto inteiro, ou um número de cotas (ex.: triedro de 6 cotas, 2 por cliente). */
export async function alterarReservaPonto(contratoId: string, pontoId: string, fd: FormData) {
  const user = await requireUser("editar", "valores");
  const volta = (tipo: "erro" | "ok", t: string) => redirect(msg(`/contratos/${contratoId}`, tipo, t));
  const ocupaTudo = fd.get("ocupaTudo") === "on";
  const cotasUsadas = Math.max(1, inteiro(fd, "cotasUsadas") || 1);

  const cp = await prisma.contratoPonto.findUnique({
    where: { contratoId_pontoId: { contratoId, pontoId } },
    include: { ponto: true, contrato: true },
  });
  if (!cp) volta("erro", "Ponto do contrato não encontrado.");
  const cotas = cp!.ponto.cotas;
  if (!cotas) volta("erro", "Este ponto não tem limite de cotas; não há o que reservar.");
  if (cotasUsadas > cotas!) volta("erro", `O ponto tem ${cotas} cota(s); o contrato não pode ocupar mais que isso.`);
  if (ocupaTudo === cp!.ocupaTudo && cotasUsadas === cp!.cotasUsadas) volta("erro", "Nada a alterar.");

  if (cp!.contrato.status === "ATIVO") {
    const lotado = await verificarCotas([{ pontoId, inicio: cp!.inicio, fim: cp!.fim, ocupaTudo, cotasUsadas }], contratoId);
    if (lotado) volta("erro", lotado);
  }
  await prisma.contratoPonto.update({ where: { contratoId_pontoId: { contratoId, pontoId } }, data: { ocupaTudo, cotasUsadas } });
  const resumo = ocupaTudo ? "ponto inteiro" : `${cotasUsadas} cota(s)`;
  await registrar(user, "alterou reserva do ponto", "Contrato", contratoId, `${cp!.ponto.nome}: ${resumo}`);
  revalidatePath("/", "layout");
  volta("ok", `${cp!.ponto.nome}: o contrato agora ocupa ${resumo}.`);
}

/** Encerra de uma vez os contratos ativos que já terminaram e não têm nenhuma parcela em aberto. */
export async function encerrarFinalizados() {
  const user = await requireUser("editar");
  const alvo = await prisma.contrato.findMany({
    where: { status: "ATIVO", fim: { lt: hoje() }, parcelas: { none: { pagoEm: null, renegociadaEm: null } } },
    select: { id: true, numero: true },
  });
  if (!alvo.length) redirect(msg("/carteira", "erro", "Não há contratos finalizados e quitados para encerrar."));
  await prisma.contrato.updateMany({ where: { id: { in: alvo.map((c) => c.id) } }, data: { status: "ENCERRADO" } });
  await registrar(user, "encerrou finalizados", "Contrato", null, `${alvo.length} contrato(s): ${alvo.map((c) => `#${c.numero}`).join(", ")}`);
  revalidatePath("/", "layout");
  redirect(msg("/carteira", "ok", `${alvo.length} contrato(s) finalizado(s) e quitado(s) foram encerrados.`));
}
