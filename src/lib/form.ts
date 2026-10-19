/** Texto opcional de um campo de formulário: vazio vira null. */
export const texto = (fd: FormData, key: string): string | null => {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
};

export const inteiro = (fd: FormData, key: string): number => Number(String(fd.get(key) ?? "").trim());

/** Data "YYYY-MM-DD" (input type=date) → meia-noite UTC, ou null se inválida. */
export function data(fd: FormData, key: string): Date | null {
  const v = String(fd.get(key) ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
