const digitos = (v: string) => v.replace(/\D/g, "");

/** CPF (11 dígitos) ou CNPJ (14): 000.000.000-00 / 00.000.000/0000-00, trocando sozinho conforme digita. */
export function maskDocumento(v: string): string {
  const d = digitos(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Telefone BR: (38) 99999-9999 (celular) ou (38) 3222-1111 (fixo). */
export function maskTelefone(v: string): string {
  const d = digitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  const corte = d.length > 10 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, corte)}-${d.slice(corte)}`;
}

/** Dinheiro BR enquanto digita: 200000 → 200.000 ; 1500,5 → 1.500,5 (vírgula separa os centavos). */
export function maskDinheiro(v: string): string {
  const virgula = v.indexOf(",");
  const inteiro = digitos(virgula >= 0 ? v.slice(0, virgula) : v).replace(/^0+(?=\d)/, "");
  const agrupado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (virgula < 0) return agrupado;
  return `${agrupado || "0"},${digitos(v.slice(virgula + 1)).slice(0, 2)}`;
}

/** Ao sair do campo: completa os centavos (1.500 → 1.500,00). */
export function completaCentavos(v: string): string {
  if (!v) return v;
  if (!v.includes(",")) return `${v},00`;
  const [i, d] = v.split(",");
  return `${i},${d.padEnd(2, "0")}`;
}

export const MASKS = { documento: maskDocumento, telefone: maskTelefone, dinheiro: maskDinheiro } as const;
