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

/** Um cliente com contrato ativo hoje, com os pontos que ocupa (agrupado, uma linha por cliente). */
export interface ClienteAtivo {
  clienteId: string;
  cliente: string;
  contratoId: string;
  contratos: number;
  pontos: { nome: string; tipo: TipoMidia }[];
  fim: Date;
  descricao: string | null;
}

const vazia = (): LinhaOcupacao => ({ capacidade: 0, clientes: 0, permuta: 0, pontos: 0, pontosOcupados: 0 });

/**
 * Carrega os pontos e contratos ativos uma vez; `calcular(data)` devolve a ocupação nessa data
 * (hoje ou uma data futura, considerando só os contratos já cadastrados).
 */
export async function carregarOcupacao() {
  const h = hoje();
  const pontos = await prisma.ponto.findMany({
    where: { ativo: true },
    select: {
      id: true,
      nome: true,
      tipo: true,
      cotas: true,
      contratos: {
        where: { contrato: { status: "ATIVO" }, fim: { gte: h } },
        select: { inicio: true, ocupaTudo: true, cotasUsadas: true, fim: true, contrato: { select: { id: true, formaPagamento: true, permutaDescricao: true, clienteId: true, cliente: { select: { nome: true } } } } },
      },
    },
  });

  function calcular(ref: Date) {
    const porTipo = new Map<TipoMidia, LinhaOcupacao>(TIPOS.map((t) => [t, vazia()]));
    const geral = vazia();
    const pagantes = new Map<string, ClienteAtivo>();
    const permutas = new Map<string, ClienteAtivo>();
    const registrar = (mapa: Map<string, ClienteAtivo>, c: (typeof pontos)[number]["contratos"][number], p: (typeof pontos)[number]) => {
      const atual = mapa.get(c.contrato.clienteId);
      if (!atual) {
        mapa.set(c.contrato.clienteId, { clienteId: c.contrato.clienteId, cliente: c.contrato.cliente.nome, contratoId: c.contrato.id, contratos: 1, pontos: [{ nome: p.nome, tipo: p.tipo }], fim: c.fim, descricao: c.contrato.permutaDescricao });
        return;
      }
      if (atual.contratoId !== c.contrato.id) atual.contratos += 1;
      atual.pontos.push({ nome: p.nome, tipo: p.tipo });
      if (c.fim > atual.fim) atual.fim = c.fim;
      if (!atual.descricao && c.contrato.permutaDescricao) atual.descricao = c.contrato.permutaDescricao;
    };

    for (const p of pontos) {
      const capacidade = p.cotas ?? 1;
      let clientes = 0;
      let permuta = 0;
      for (const c of p.contratos) {
        if (c.inicio > ref || c.fim < ref) continue;
        const peso = p.cotas ? pesoNoPonto(c, p.cotas) : 1;
        if (c.contrato.formaPagamento === "PERMUTA") {
          permuta += peso;
          registrar(permutas, c, p);
        } else {
          clientes += peso;
          registrar(pagantes, c, p);
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
      referencia: ref,
      geral,
      porTipo: TIPOS.map((t) => ({ tipo: t, ...porTipo.get(t)! })).filter((l) => l.pontos > 0),
      clientesPagantes: [...pagantes.values()].sort((a, b) => a.cliente.localeCompare(b.cliente)),
      clientesPermuta: [...permutas.values()].sort((a, b) => a.cliente.localeCompare(b.cliente)),
    };
  }

  return { calcular };
}

export type OcupacaoEm = ReturnType<Awaited<ReturnType<typeof carregarOcupacao>>["calcular"]>;

/** Percentuais de uma linha, que sempre somam 100: clientes que pagam, permuta e livre (ociosidade). */
export function percentuais(l: LinhaOcupacao) {
  const c = l.capacidade > 0 ? Math.round((l.clientes / l.capacidade) * 100) : 0;
  const p = l.capacidade > 0 ? Math.round((l.permuta / l.capacidade) * 100) : 0;
  const livre = l.capacidade > 0 ? Math.max(0, 100 - c - p) : 0;
  return { clientes: c, permuta: p, ocupada: c + p, livre, potencial: livre + p };
}
