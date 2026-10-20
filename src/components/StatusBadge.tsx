import type { StatusParcela } from "@/lib/financeiro";

const ESTILO: Record<StatusParcela, { texto: string; cor: string }> = {
  PAGA: { texto: "Recebida", cor: "text-good" },
  ATRASADA: { texto: "Em atraso", cor: "text-danger" },
  A_VENCER: { texto: "A vencer", cor: "text-warn" },
};

export default function StatusBadge({ status, rotulos }: { status: StatusParcela; rotulos?: Partial<Record<StatusParcela, string>> }) {
  const e = ESTILO[status];
  return <span className={`badge ${e.cor}`}>{rotulos?.[status] ?? e.texto}</span>;
}
