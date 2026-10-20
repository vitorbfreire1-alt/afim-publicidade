import { prisma } from "./prisma";

export interface LinhaComissao {
  contratoId: string;
  contratoNumero: number;
  cliente: string;
  recebido: number;
  pct: number;
  comissao: number;
}

export interface ComissaoVendedor {
  vendedorId: string;
  vendedor: string;
  base: number;
  total: number;
  linhas: LinhaComissao[];
}

/** Limites (datas UTC) do mês "AAAA-MM". */
export function limitesDoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return { inicio: new Date(Date.UTC(a, m - 1, 1)), fim: new Date(Date.UTC(a, m, 0)) };
}

export const mesValido = (v?: string) => (v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : null);

/** Comissão = % do contrato sobre o que foi efetivamente recebido no mês (pela data de pagamento). */
export async function comissoesDoMes(mes: string, apenasVendedorId?: string): Promise<ComissaoVendedor[]> {
  const { inicio, fim } = limitesDoMes(mes);
  const parcelas = await prisma.parcela.findMany({
    where: {
      pagoEm: { gte: inicio, lte: fim },
      contrato: { vendedorId: apenasVendedorId ?? { not: null }, comissaoPct: { not: null } },
    },
    select: { valorPago: true, contrato: { select: { id: true, numero: true, vendedorId: true, comissaoPct: true, cliente: { select: { nome: true } }, vendedor: { select: { nome: true } } } } },
  });

  const porVendedor = new Map<string, ComissaoVendedor>();
  const porContrato = new Map<string, LinhaComissao>();
  for (const p of parcelas) {
    const c = p.contrato;
    const pct = Number(c.comissaoPct);
    const recebido = Number(p.valorPago ?? 0);
    let v = porVendedor.get(c.vendedorId!);
    if (!v) {
      v = { vendedorId: c.vendedorId!, vendedor: c.vendedor!.nome, base: 0, total: 0, linhas: [] };
      porVendedor.set(c.vendedorId!, v);
    }
    let l = porContrato.get(c.id);
    if (!l) {
      l = { contratoId: c.id, contratoNumero: c.numero, cliente: c.cliente.nome, recebido: 0, pct, comissao: 0 };
      porContrato.set(c.id, l);
      v.linhas.push(l);
    }
    l.recebido += recebido;
    l.comissao += (recebido * pct) / 100;
  }
  for (const v of porVendedor.values()) {
    v.linhas.forEach((l) => (l.comissao = Math.round(l.comissao * 100) / 100));
    v.base = v.linhas.reduce((s, l) => s + l.recebido, 0);
    v.total = Math.round(v.linhas.reduce((s, l) => s + l.comissao, 0) * 100) / 100;
  }
  return [...porVendedor.values()].sort((a, b) => b.total - a.total);
}
