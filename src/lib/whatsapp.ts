import { dateBR, diasEntre, hoje, money } from "./format";

/** Telefone brasileiro → só dígitos com DDI 55. Retorna null se não parecer um telefone válido. */
export function telefoneWhatsapp(telefone: string | null | undefined): string | null {
  const d = (telefone ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return null;
}

interface Dados {
  cliente: { nome: string; contato: string | null; telefone: string | null };
  numero: number;
  total: number;
  vencimento: Date;
  valor: unknown;
}

/** Link do WhatsApp com a mensagem pronta (lembrete se ainda não venceu, cobrança se já venceu). */
export function linkCobranca({ cliente, numero, total, vencimento, valor }: Dados): string | null {
  const fone = telefoneWhatsapp(cliente.telefone);
  if (!fone) return null;

  const dias = diasEntre(vencimento, hoje());
  const saudacao = `Olá, ${cliente.contato || cliente.nome}! Tudo bem?`;
  const parcela = `parcela ${numero}/${total}, no valor de ${money(valor)}`;
  const texto =
    dias > 0
      ? `${saudacao} Aqui é da AFIM Publicidade. Identificamos que a ${parcela}, venceu em ${dateBR(vencimento)} (${dias} dia(s) de atraso). Pode nos enviar o comprovante ou informar a previsão de pagamento? Obrigado!`
      : `${saudacao} Aqui é da AFIM Publicidade. Passando para lembrar que a ${parcela}, vence em ${dateBR(vencimento)}. Qualquer dúvida, estamos à disposição. Obrigado!`;

  return `https://wa.me/${fone}?text=${encodeURIComponent(texto)}`;
}
