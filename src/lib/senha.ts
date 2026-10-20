const COMUNS = new Set([
  "1234567890", "12345678910", "0123456789", "senha12345", "senha123456", "password123", "password1234", "qwerty12345", "qwertyuiop1",
  "admin12345", "mudar12345", "melancia12", "melancia123", "afim123456", "afim2026", "abc1234567", "brasil12345", "brasil2026",
]);

/** Regra de senha forte. Retorna a mensagem do problema ou null se a senha serve. */
export function validarSenha(senha: string, contexto: { email?: string; nome?: string } = {}): string | null {
  if (senha.length < 10) return "A senha precisa ter ao menos 10 caracteres.";
  if (senha.length > 72) return "A senha pode ter no máximo 72 caracteres.";
  if (!/[A-Za-zÀ-ÿ]/.test(senha) || !/\d/.test(senha)) return "Use letras e números na senha.";
  const baixa = senha.toLowerCase();
  if (COMUNS.has(baixa) || /^(.)\1+$/.test(baixa)) return "Essa senha é muito comum. Escolha outra.";
  const parteEmail = contexto.email?.split("@")[0]?.toLowerCase();
  if (parteEmail && parteEmail.length >= 4 && baixa.includes(parteEmail)) return "A senha não pode conter o seu e-mail.";
  const primeiroNome = contexto.nome?.trim().split(/\s+/)[0]?.toLowerCase();
  if (primeiroNome && primeiroNome.length >= 4 && baixa.includes(primeiroNome)) return "A senha não pode conter o seu nome.";
  return null;
}
