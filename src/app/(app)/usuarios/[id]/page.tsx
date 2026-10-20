import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/Flash";
import PermissoesCampos from "@/components/PermissoesCampos";
import { salvarPermissoes } from "@/app/actions/usuarios";
import { requireUser } from "@/lib/auth";
import { MODELOS, normalizar, rotuloPerfil, type ModeloId } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Permissões do usuário" };

export default async function PermissoesUsuario({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [eu, { id }, sp] = await Promise.all([requireUser("DONO"), params, searchParams]);
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) notFound();

  // Modelo "atual": o que bate exatamente com as permissões; senão, o mais próximo do perfil de origem.
  const atual = normalizar(u.permissoes);
  const exato = MODELOS.find((m) => m.id !== "DONO" && m.permissoes.length === atual.length && m.permissoes.every((p) => atual.includes(p)));
  const modeloInicial: ModeloId = u.papel === "DONO" ? "DONO" : exato?.id ?? (u.papel === "FINANCEIRO" ? "FINANCEIRO" : "COMERCIAL");

  return (
    <main className="max-w-4xl space-y-5">
      <Flash erro={sp.erro} ok={sp.ok} />
      <div>
        <Link href="/usuarios" className="text-xs text-gold hover:underline">← Usuários</Link>
        <h1 className="mt-1">{u.nome}{u.id === eu.id && " (você)"}</h1>
        <p className="text-sm text-ink-soft">{u.email} · {rotuloPerfil(u.papel, u.permissoes)}{!u.ativo && " · desativado"}</p>
      </div>

      <form action={salvarPermissoes.bind(null, id)} className="card grid gap-4 p-5">
        <h2 className="text-sm font-semibold text-gold-soft">O que esta pessoa pode ver e fazer</h2>
        <PermissoesCampos modeloInicial={modeloInicial} permissoesIniciais={u.permissoes} />
        <div><button className="btn btn-gold" type="submit">Salvar permissões</button></div>
      </form>
    </main>
  );
}
