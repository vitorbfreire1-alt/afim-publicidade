import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Diagnóstico de implantação: diz o que falta configurar, sem expor valores. */
export async function GET() {
  const config = {
    SESSION_SECRET: (process.env.SESSION_SECRET?.length ?? 0) >= 32,
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DIRECT_URL: Boolean(process.env.DIRECT_URL),
  };

  // Só partes não secretas da conexão, para achar erro de digitação sem expor a senha.
  const descreve = (raw?: string) => {
    if (!raw) return null;
    try {
      const u = new URL(raw.trim());
      const senha = decodeURIComponent(u.password);
      return {
        usuario: decodeURIComponent(u.username),
        servidor: `${u.hostname}:${u.port}`,
        banco: u.pathname,
        tamanhoSenha: senha.length,
        senhaComColchete: /[\[\]]/.test(senha),
        urlComEspaco: raw !== raw.trim() || /\s/.test(raw.trim()),
      };
    } catch {
      return "URL inválida";
    }
  };
  const conexao = { DATABASE_URL: descreve(process.env.DATABASE_URL), DIRECT_URL: descreve(process.env.DIRECT_URL) };

  let banco = "ok";
  try {
    await prisma.usuario.count();
  } catch (e) {
    const err = e as { code?: string; errorCode?: string; message?: string; name: string };
    // Sem credenciais: troca qualquer URL de conexão e fica só com o fim da mensagem.
    const detalhe = (err.message ?? "").replace(/postgres(ql)?:\/\/\S+/g, "[url]").trim().split("\n").slice(-4).join(" ");
    banco = `erro ${err.errorCode ?? err.code ?? err.name}: ${detalhe}`.slice(0, 500);
  }

  return Response.json({ config, conexao, banco }, { status: banco === "ok" && Object.values(config).every(Boolean) ? 200 : 500 });
}
