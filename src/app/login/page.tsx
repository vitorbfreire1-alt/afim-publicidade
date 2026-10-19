import { ArrowRight, Lock, Mail } from "lucide-react";
import Flash from "@/components/Flash";
import Logo from "@/components/Logo";
import { login } from "@/app/actions/auth";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Brilho dourado atrás do cartão */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-[110px]" />

      <form action={login} className="card rise relative w-full max-w-sm space-y-5 p-7 sm:p-9">
        <div className="flex flex-col items-center gap-3 pb-2 text-center">
          <Logo size="lg" />
          <p className="text-xs uppercase tracking-[0.3em] text-ink-faint">Gestão de mídia exterior</p>
        </div>
        <Flash erro={erro} />
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <div className="relative">
            <Mail aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <input className="input !pl-10" id="email" name="email" type="email" autoComplete="username" required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="senha">Senha</label>
          <div className="relative">
            <Lock aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <input className="input !pl-10" id="senha" name="senha" type="password" autoComplete="current-password" required />
          </div>
        </div>
        <button className="btn btn-gold w-full" type="submit">
          Entrar <ArrowRight className="size-4" />
        </button>
      </form>
    </main>
  );
}
