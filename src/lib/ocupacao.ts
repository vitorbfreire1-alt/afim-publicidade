import type { TipoMidia } from "@prisma/client";
import { pesoNoPonto } from "./cotas";
import { hoje } from "./format";
import { TIPOS } from "./labels";
import { prisma } from "./prisma";

export interface LinhaOcupacao {
  /** Capacidade total (soma das cotas; ponto sem limite de cotas conta como 1). */
  capacidade: number;
  /** Cotas ocupadas por clientes que pagam. */
  clientes: number;
  /** Cotas ocupadas por permuta. */
  permuta: number;
  pontos: number;
  pontosOcupados: number;
}

export interface Permuta {
  contratoId: string;
  cliente: string;
  ponto: string;
  tipo: TipoMidia;
  descricao: string | null;
  fim: Date;
}

const vazia = (): LinhaOcupacao => ({ capacidade: 0, clientes: 0, permuta: 0, pontos: 0, pontosOcupados: 0 });

/** Taxa de ocupação de hoje, geral e por tipo de mídia, separando cotas de clientes que pagam e de permuta. */
export async function ocupacaoDoDia() {
  const h = hoje();
  const pontos = await prisma.ponto.findMany({
    where: { ativo: true },
    select: {
      id: true,
      nome: true,
      tipo: true,
      cotas: true,
      contratos: {
        where: { contrato: { status: "ATIVO" }, inicio: { lte: h }, fim: { gte: h } },
        select: { ocupaTudo: true, cotasUsadas: true, fim: true, contrato: { select: { id: true, formaPagamento: true, permutaDescricao: true, clienteId: true, cliente: { select: { nome: true } } } } },
      },
    },
  });

  const porTipo = new Map<TipoMidia, LinhaOcupacao>(TIPOS.map((t) => [t, vazia()]));
  const geral = vazia();
  const clientesPagantes = new Set<string>();
  const clientesPermuta = new Set<string>();
  const permutas: Permuta[] = [];

  for (const p of pontos) {
    const capacidade = p.cotas ?? 1;
    let clientes = 0;
    let permuta = 0;
    for (const c of p.contratos) {
      const peso = p.cotas ? pesoNoPonto(c, p.cotas) : 1;
      if (c.contrato.formaPagamento === "PERMUTA") {
        permuta += peso;
        clientesPermuta.add(c.contrato.clienteId);
        permutas.push({ contratoId: c.contrato.id, cliente: c.contrato.cliente.nome, ponto: p.nome, tipo: p.tipo, descricao: c.contrato.permutaDescricao, fim: c.fim });
      } else {
        clientes += peso;
        clientesPagantes.add(c.contrato.clienteId);
      }
    }
    // Nunca passa da capacidade do ponto; em caso de excesso, quem paga tem prioridade (sempre números inteiros).
    const total = clientes + permuta;
    clientes = Math.min(clientes, capacidade);
    permuta = Math.min(permuta, capacidade - clientes);
    for (const alvo of [porTipo.get(p.tipo)!, geral]) {
      alvo.capacidade += capacidade;
      alvo.clientes += clientes;
      alvo.permuta += permuta;
      alvo.pontos += 1;
      if (total > 0) alvo.pontosOcupados += 1;
    }
  }

  return {
    geral,
    porTipo: TIPOS.map((t) => ({ tipo: t, ...porTipo.get(t)! })).filter((l) => l.pontos > 0),
    clientesPagantes: clientesPagantes.size,
    clientesPermuta: clientesPermuta.size,
    permutas: permutas.sort((a, b) => a.cliente.localeCompare(b.cliente)),
  };
}
