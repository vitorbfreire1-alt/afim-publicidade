import Flash from "@/components/Flash";
import { alternarUsuario, criarUsuario, redefinirSenha } from "@/app/actions/usuarios";
import Link from "next/link";
import PermissoesCampos from "@/components/PermissoesCampos";
import { requireUser } from "@/lib/auth";
import { MODELOS, rotuloPerfil } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuários" };

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [eu, { erro, ok }] = await Promise.all([requireUser("DONO"), searchParams]);
  const usuarios = await prisma.usuario.findMany({ orderBy: [{ ativo: "desc" }, { nome: "asc" }] });

  return (
    <main className="max-w-4xl">
      <Flash erro={erro} ok={ok} />
      <h1 className="mb-4 text-xl font-bold">Usuários</h1>

      <form action={criarUsuario} className="card mb-6 grid gap-4 p-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="nome">Nome</label><input className="input" id="nome" name="nome" required /></div>
        <div><label className="label" htmlFor="email">E-mail</label><input className="input" id="email" name="email" type="email" required /></div>
        <div>
          <label className="label" htmlFor="senha">Senha inicial (mín. 10, letras e números)</label>
          <input className="input" id="senha" name="senha" type="password" minLength={10} autoComplete="new-password" required />
        </div>
        <PermissoesCampos modeloInicial="FUNCIONARIO" permissoesIniciais={MODELOS.find((m) => m.id === "FUNCIONARIO")!.permissoes} />
        <div className="sm:col-span-2"><button className="btn btn-gold" type="submit">Criar usuário</button></div>
      </form>

      <div className="card divide-y divide-line">
        {usuarios.map((u) => (
          <div key={u.id} className={`flex flex-wrap items-center justify-between gap-3 p-3 ${u.ativo ? "" : "opacity-50"}`}>
            <div className="min-w-0">
              <p className="truncate font-medium">{u.nome}</p>
              <p className="truncate text-xs text-ink-soft">{u.email} · {rotuloPerfil(u.papel, u.permissoes)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link className="btn btn-sm" href={`/usuarios/${u.id}`}>Permissões</Link>
              <form action={redefinirSenha.bind(null, u.id)} className="flex gap-2">
                <input className="input !min-h-9 w-36" name="senha" type="password" minLength={10} placeholder="Nova senha" autoComplete="new-password" required />
                <button className="btn btn-sm" type="submit">Trocar</button>
              </form>
              {u.id !== eu.id && (
                <form action={alternarUsuario.bind(null, u.id)}>
                  <button className="btn btn-sm btn-danger" type="submit">{u.ativo ? "Desativar" : "Reativar"}</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
