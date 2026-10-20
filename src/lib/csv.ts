export type Celula = string | number | Date | null | undefined;

const fmtData = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);

function celula(v: Celula): string {
  let t = v == null ? "" : v instanceof Date ? fmtData(v) : typeof v === "number" ? String(v).replace(".", ",") : v;
  // Evita que o Excel interprete o texto como fórmula (CSV injection).
  if (/^[=+\-@\t\r]/.test(t) && typeof v === "string") t = `'${t}`;
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** CSV para Excel em português: separador ";", vírgula decimal, UTF-8 com BOM. */
export function paraCsv(cabecalho: string[], linhas: Celula[][]): string {
  return "﻿" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
}
