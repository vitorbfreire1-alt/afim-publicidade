import { calcularEncargos, regrasDe } from "./encargos";
import { getConfig } from "./config";
import { hoje } from "./format";
import { lucroPorPonto } from "./lucro";
import { prisma } from "./prisma";

export interface Periodo {
  inicio: Date;
  fim: Date;
}

/** Período a partir de ?de=&ate= (AAAA-MM-DD); padrão: do início do ano até hoje. */
export function periodoDe(de?: string, ate?: string): Periodo {
  const h = hoje();
  const ok = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) ? new Date(`${v}T00:00:00Z`) : null);
  const inicio = ok(de) ?? new Date(Date.UTC(h.getUTCFullYear(), 0, 1));
  const fim = ok(ate) ?? h;
  return inicio <= fim ? { inicio, fim } : { inicio: fim, fim: inicio };
}

const chaveMes = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export async function relatorioFinanceiro({ inicio, fim }: Periodo) {
  const h = hoje();
  const config = await getConfig();
  const regras = regrasDe(config);

  const [recebidas, despesas, abertas, lucro, pontos] = await Promise.all([
    prisma.parcela.findMany({
      where: { pagoEm: { gte: inicio, lte: fim } },
      select: { valorPago: true, pagoEm: true, contrato: { select: { cliente: { select: { id: true, nome: true } } } } },
    }),
    prisma.despesa.findMany({ where: { pagoEm: { gte: inicio, lte: fim } }, select: { categoria: true, valorPago: true } }),
    prisma.parcela.findMany({
      where: { pagoEm: null, renegociadaEm: null, vencimento: { lt: h }, contrato: { status: "ATIVO" } },
      select: { valor: true, vencimento: true, contrato: { select: { cliente: { select: { id: true, nome: true } } } } },
    }),
    lucroPorPonto(inicio, fim),
    prisma.ponto.findMany({ select: { id: true, tipo: true } }),
  ]);

  const porMes = new Map<string, number>();
  const porCliente = new Map<string, { nome: string; total: number }>();
  for (const p of recebidas) {
    const v = Number(p.valorPago ?? 0);
    porMes.set(chaveMes(p.pagoEm!), (porMes.get(chaveMes(p.pagoEm!)) ?? 0) + v);
    const c = p.contrato.cliente;
    porCliente.set(c.id, { nome: c.nome, total: (porCliente.get(c.id)?.total ?? 0) + v });
  }

  const tipoDoPonto = new Map(pontos.map((p) => [p.id, p.tipo]));
  const porTipo = new Map<string, number>();
  for (const l of lucro.pontos) porTipo.set(tipoDoPonto.get(l.pontoId) ?? "OUTRO", (porTipo.get(tipoDoPonto.get(l.pontoId) ?? "OUTRO") ?? 0) + l.receita);

  const porCategoria = new Map<string, number>();
  for (const d of despesas) porCategoria.set(d.categoria, (porCategoria.get(d.categoria) ?? 0) + Number(d.valorPago ?? 0));

  // Inadimplência por cliente, com faixas de atraso e valor atualizado.
  const faixas = ["1–30 dias", "31–60 dias", "61–90 dias", "Mais de 90"] as const;
  const inad = new Map<string, { nome: string; faixas: number[]; nominal: number; atualizado: number }>();
  for (const p of abertas) {
    const c = p.contrato.cliente;
    const e = calcularEncargos(Number(p.valor), p.vencimento, regras, h);
    const i = e.dias <= 30 ? 0 : e.dias <= 60 ? 1 : e.dias <= 90 ? 2 : 3;
    const linha = inad.get(c.id) ?? { nome: c.nome, faixas: [0, 0, 0, 0], nominal: 0, atualizado: 0 };
    linha.faixas[i] += Number(p.valor);
    linha.nominal += Number(p.valor);
    linha.atualizado += e.total;
    inad.set(c.id, linha);
  }

  const totalRecebido = [...porMes.values()].reduce((s, v) => s + v, 0);
  const totalDespesas = [...porCategoria.values()].reduce((s, v) => s + v, 0) + 0;
  return {
    totalRecebido,
    totalDespesas,
    porMes: [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)),
    porTipo: [...porTipo.entries()].sort(([, a], [, b]) => b - a),
    porCliente: [...porCliente.values()].sort((a, b) => b.total - a.total),
    porCategoria: [...porCategoria.entries()].sort(([, a], [, b]) => b - a),
    faixas,
    inadimplencia: [...inad.values()].sort((a, b) => b.atualizado - a.atualizado),
  };
}
