/** Mensagens vindas da query string (?erro= / ?ok=) após uma action. */
export default function Flash({ erro, ok }: { erro?: string; ok?: string }) {
  if (!erro && !ok) return null;
  return (
    <p
      role={erro ? "alert" : "status"}
      className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
        erro ? "border-danger/50 text-danger" : "border-good/50 text-good"
      }`}
    >
      {erro ?? ok}
    </p>
  );
}

export const msg = (path: string, kind: "erro" | "ok", text: string) =>
  `${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(text)}`;
