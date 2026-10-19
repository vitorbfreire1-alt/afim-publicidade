/** Abre o WhatsApp do cliente com a mensagem de cobrança pronta; sem telefone válido, avisa em vez de sumir. */
export default function BotaoWhatsapp({ href }: { href: string | null }) {
  if (!href) return <span className="text-xs text-ink-faint" title="Cliente sem telefone válido">Sem telefone</span>;
  return (
    <a className="btn btn-sm" href={href} target="_blank" rel="noopener noreferrer">
      WhatsApp
    </a>
  );
}
