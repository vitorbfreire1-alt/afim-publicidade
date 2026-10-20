const UNID = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENT = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CENT[c]);
  if (r) partes.push(r < 20 ? UNID[r] : DEZ[Math.floor(r / 10)] + (r % 10 ? " e " + UNID[r % 10] : ""));
  return partes.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (milhoes) partes.push(milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`);
  if (milhares) partes.push(milhares === 1 ? "mil" : `${ate999(milhares)} mil`);
  if (resto) partes.push(ate999(resto));
  // "e" antes do último bloco quando ele é menor que 100 ou múltiplo de 100 (ex.: mil e quinhentos).
  if (partes.length > 1 && (resto < 100 || resto % 100 === 0) && resto) {
    return partes.slice(0, -1).join(" ") + " e " + partes.at(-1);
  }
  return partes.join(" ");
}

/** 1500.5 → "mil e quinhentos reais e cinquenta centavos". */
export function valorPorExtenso(valor: number): string {
  const total = Math.round(Math.abs(valor) * 100);
  const reais = Math.floor(total / 100);
  const centavos = total % 100;
  const r = reais ? `${inteiroPorExtenso(reais)} ${reais === 1 ? "real" : "reais"}` : "";
  const c = centavos ? `${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}` : "";
  return [r, c].filter(Boolean).join(" e ") || "zero reais";
}
