import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Diagnóstico de implantação: diz o que falta configurar, sem expor valores. */
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
    const code = (e as { code?: string }).code ?? (e as Error).name;
    banco = `erro ${code}`;
  }

  return Response.json({ config, banco }, { status: banco === "ok" && Object.values(config).every(Boolean) ? 200 : 500 });
}
