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

export const MASKS = { documento: maskDocumento, telefone: maskTelefone } as const;
