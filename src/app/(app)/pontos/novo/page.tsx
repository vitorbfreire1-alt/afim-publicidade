import Flash from "@/components/Flash";
import PontoForm from "@/components/PontoForm";
import { criarPonto } from "@/app/actions/pontos";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Novo ponto" };

export default async function NovoPonto({ searchParams }: { searchParams: Promise<{ erro?: string; tipo?: string }> }) {
  const [, { erro, tipo }] = await Promise.all([requireUser("COMERCIAL"), searchParams]);
  return (
    <main className="max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">Novo ponto de mídia</h1>
      <Flash erro={erro} />
      <PontoForm action={criarPonto} tipoInicial={tipo} label="Cadastrar ponto" />
    </main>
  );
}
