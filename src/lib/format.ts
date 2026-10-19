const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const money = (v: unknown) => brl.format(Number(v ?? 0));

/** "1.500,50" ou "1500.50" → 1500.5 (NaN se inválido). */
export function parseMoney(raw: FormDataEntryValue | null): number {
  const s = String(raw ?? "").trim().replace(/[R$\s]/g, "");
  if (!s) return NaN;
  const n = s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Colunas @db.Date vêm como meia-noite UTC; formata sem deslocar o dia pelo fuso. */
export const dateBR = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d) : "—";

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Hoje (fuso de Montes Claros) como meia-noite UTC, comparável com colunas Date. */
export function hoje(): Date {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return new Date(`${s}T00:00:00Z`);
}

export function addDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

export const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);
