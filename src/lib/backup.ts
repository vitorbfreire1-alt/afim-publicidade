import { prisma } from "./prisma";

/**
 * Cópia completa dos dados em JSON (Datas em ISO, valores decimais como texto).
 * Hashes de senha e contadores de login ficam de fora. Anexos: só os metadados, ou o conteúdo em base64 se pedido.
 */
export async function gerarBackup(comAnexos: boolean) {
  const [usuarios, clientes, pontos, contratos, contratosPontos, parcelas, acordos, despesas, reajustes, propostas, propostasPontos, comissoes, ocorrencias, arquivos, metas, config, auditoria] = await Promise.all([
    prisma.usuario.findMany({ select: { id: true, nome: true, email: true, papel: true, ativo: true, criadoEm: true } }),
    prisma.cliente.findMany(),
    prisma.ponto.findMany(),
    prisma.contrato.findMany(),
    prisma.contratoPonto.findMany(),
    prisma.parcela.findMany(),
    prisma.acordo.findMany(),
    prisma.despesa.findMany(),
    prisma.reajuste.findMany(),
    prisma.proposta.findMany(),
    prisma.propostaPonto.findMany(),
    prisma.comissaoFechamento.findMany(),
    prisma.ocorrencia.findMany(),
    prisma.arquivo.findMany({ select: { id: true, nome: true, mime: true, tamanho: true, categoria: true, descricao: true, dataRef: true, contratoId: true, pontoId: true, ocorrenciaId: true, clienteId: true, enviadoPorNome: true, criadoEm: true, ...(comAnexos ? { dados: true } : {}) } }),
    prisma.meta.findMany(),
    prisma.config.findMany(),
    prisma.auditoria.findMany({ orderBy: { criadoEm: "asc" } }),
  ]);

  const tabelas = {
    usuarios, clientes, pontos, contratos, contratosPontos, parcelas, acordos, despesas, reajustes, propostas, propostasPontos,
    comissoes, ocorrencias,
    arquivos: arquivos.map((a) => ("dados" in a && a.dados ? { ...a, dados: Buffer.from(a.dados as Uint8Array).toString("base64") } : a)),
    metas, config, auditoria,
  };
  const contagens = Object.fromEntries(Object.entries(tabelas).map(([k, v]) => [k, v.length]));
  return { sistema: "AFIM Publicidade", geradoEm: new Date().toISOString(), comAnexos, contagens, tabelas };
}
