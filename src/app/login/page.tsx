import Flash from "@/components/Flash";
import Logo from "@/components/Logo";
import { login } from "@/app/actions/auth";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <form action={login} className="card w-full max-w-sm space-y-4 p-6">
        <div className="flex justify-center pb-2">
          <Logo size="lg" />
        </div>
        <Flash erro={erro} />
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div>
          <label className="label" htmlFor="senha">Senha</label>
          <input className="input" id="senha" name="senha" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn btn-gold w-full" type="submit">Entrar</button>
      </form>
    </main>
  );
}
