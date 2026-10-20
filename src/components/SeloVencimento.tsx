import { COR_NIVEL, diasRestantes, nivelDe, textoPrazo } from "@/lib/vencimento";

/** Selo de urgência do fim do contrato/ponto: só aparece nos últimos 60 dias (ou se já terminou). */
export default function SeloVencimento({ fim, ativo = true }: { fim: Date; ativo?: boolean }) {
  if (!ativo) return null;
  const dias = diasRestantes(fim);
  const nivel = nivelDe(dias);
  if (!nivel) return null;
  return <span className={`badge ${COR_NIVEL[nivel]} whitespace-nowrap`}>{textoPrazo(dias)}</span>;
}
