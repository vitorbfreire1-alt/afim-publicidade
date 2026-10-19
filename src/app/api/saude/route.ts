import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Diagnóstico de implantação: diz se a configuração e o banco estão ok, sem expor detalhes. */
export async function GET() {
  const config = {
    SESSION_SECRET: (process.env.SESSION_SECRET?.length ?? 0) >= 32,
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DIRECT_URL: Boolean(process.env.DIRECT_URL),
  };

  let banco = "ok";
  try {
    await prisma.usuario.count();
  } catch (e) {
    const err = e as { code?: string; errorCode?: string; name: string };
    banco = `erro ${err.errorCode ?? err.code ?? err.name}`;
  }

  return Response.json({ config, banco }, { status: banco === "ok" && Object.values(config).every(Boolean) ? 200 : 500 });
}
