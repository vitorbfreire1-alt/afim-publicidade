import Flash from "@/components/Flash";
import AtivarNotificacoes from "@/components/AtivarNotificacoes";
import InstalarApp from "@/components/InstalarApp";
import { trocarMinhaSenha } from "@/app/actions/usuarios";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha conta" };

export default async function Conta({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  return (
    <main className="max-w-xl space-y-5">
      <Flash erro={sp.erro} ok={sp.ok} />
      <h1>Minha conta</h1>
      <section className="card p-5">
        <p className="font-semibold">{user.nome}</p>
        <p className="text-sm text-ink-soft">{user.email} · {user.perfil}</p>
      </section>

      <InstalarApp variante="cartao" />
      <AtivarNotificacoes />

      <form action={trocarMinhaSenha} className="card grid gap-4 p-5">
        <h2 className="text-sm font-semibold text-gold-soft">Trocar minha senha</h2>
        <div>
          <label className="label" htmlFor="atual">Senha atual</label>
          <input className="input" id="atual" name="atual" type="password" autoComplete="current-password" required />
        </div>
        <div>
          <label className="label" htmlFor="nova">Nova senha</label>
          <input className="input" id="nova" name="nova" type="password" autoComplete="new-password" minLength={10} required />
          <p className="mt-1 text-xs text-ink-faint">Mínimo de 10 caracteres, com letras e números. Evite seu nome, seu e-mail e senhas comuns.</p>
        </div>
        <div>
          <label className="label" htmlFor="confirmar">Repita a nova senha</label>
          <input className="input" id="confirmar" name="confirmar" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        <div><button className="btn btn-gold" type="submit">Salvar nova senha</button></div>
      </form>
    </main>
  );
}
