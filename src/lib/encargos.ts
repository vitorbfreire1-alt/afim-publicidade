import { diasEntre, hoje } from "./format";

export interface RegrasEncargos {
  multaPct: number; // multa única sobre o valor, aplicada a qualquer atraso
  jurosMesPct: number; // juros ao mês, proporcional aos dias de atraso (mês de 30 dias)
}

const arredonda = (n: number) => Math.round(n * 100) / 100;

/** Valor atualizado de uma parcela em atraso. Em dia (ou paga), `total` é o próprio valor. */
export function calcularEncargos(valor: number, vencimento: Date, regras: RegrasEncargos, ref = hoje()) {
  const dias = Math.max(0, diasEntre(vencimento, ref));
  const multa = dias > 0 ? arredonda((valor * regras.multaPct) / 100) : 0;
  const juros = dias > 0 ? arredonda(((valor * regras.jurosMesPct) / 100) * (dias / 30)) : 0;
  return { dias, multa, juros, total: arredonda(valor + multa + juros) };
}

export const regrasDe = (c: { multaPct: unknown; jurosMesPct: unknown }): RegrasEncargos => ({
  multaPct: Number(c.multaPct),
  jurosMesPct: Number(c.jurosMesPct),
});
