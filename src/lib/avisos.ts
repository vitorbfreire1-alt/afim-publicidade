import { alertas, filtroDespesaEmAtraso } from "@/lib/financeiro";
import { addDias, hoje, money } from "@/lib/format";
import { pode, type UsuarioLogado } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { diasRestantes, textoPrazo } from "@/lib/vencimento";
import type { AvisoPush } from "@/lib/push";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Resumo do dia para o usuário, só com o que a permissão dele deixa ver. Nulo quando não há nada a avisar. */
export async function resumoDoDia(user: UsuarioLogado): Promise<AvisoPush | null> {
  const h = hoje();
  const a = await alertas();
  const linhas: string[] = [];
  let url = "/";

  if (pode(user, "receber")) {
    const atraso = a.atrasadas.length;
    const vencendo = a.aVencer.filter((p) => p.vencimento <= addDias(h, 3)).length;
    if (atraso) {
      const total = a.atrasadas.reduce((s, p) => s + Number(p.valor), 0);
      linhas.push(`${plural(atraso, "parcela em atraso", "parcelas em atraso")}${pode(user, "valores") ? ` (${money(total)})` : ""}`);
      url = "/carteira";
    }
    if (vencendo) linhas.push(`${plural(vencendo, "parcela vence", "parcelas vencem")} em até 3 dias`);
  }
  if (pode(user, "despesas")) {
    const atrasadas = await prisma.despesa.count({ where: filtroDespesaEmAtraso() });
    const proximas = a.despesas.filter((d) => d.vencimento >= h && d.vencimento <= addDias(h, 3)).length;
    if (atrasadas) linhas.push(`${plural(atrasadas, "despesa vencida", "despesas vencidas")}`);
    if (proximas) linhas.push(`${plural(proximas, "despesa vence", "despesas vencem")} em até 3 dias`);
  }
  if (pode(user, "carteira")) {
    // Fim de contrato: aviso nos marcos de 60, 30 e 15 dias e todo dia na última semana (e na semana seguinte ao fim).
    const fins = await prisma.contratoPonto.findMany({
      where: { contrato: { status: "ATIVO" }, fim: { gte: addDias(h, -7), lte: addDias(h, 60) } },
      include: { contrato: { include: { cliente: true } } },
      orderBy: { fim: "asc" },
    });
    const hoje_ = fins.filter((c) => {
      const d = diasRestantes(c.fim, h);
      return d <= 7 || d === 15 || d === 30 || d === 60;
    });
    if (hoje_.length) {
      const primeiro = hoje_[0];
      const d = diasRestantes(primeiro.fim, h);
      const nome = primeiro.contrato.cliente.nome;
      linhas.push(
        hoje_.length === 1
          ? `Contrato de ${nome} ${textoPrazo(d)}`
          : `${hoje_.length} contratos para renovar (o mais próximo: ${nome}, ${textoPrazo(d)})`,
      );
      if (url === "/") url = "/renovacoes";
    }
  }
  if (pode(user, "manutencao") && a.ocorrencias.length) {
    linhas.push(`${plural(a.ocorrencias.length, "ocorrência aberta", "ocorrências abertas")}`);
  }
  if (!linhas.length) return null;
  return { titulo: "AFIM · resumo do dia", corpo: linhas.join(" · "), url };
}
