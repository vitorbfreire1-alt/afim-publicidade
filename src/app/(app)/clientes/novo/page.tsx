import Flash from "@/components/Flash";
import ClienteForm from "@/components/ClienteForm";
import { criarCliente } from "@/app/actions/clientes";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Novo cliente" };

export default async function NovoCliente({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const [, { erro }] = await Promise.all([requireUser("editar"), searchParams]);
  return (
    <main className="max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">Novo cliente</h1>
      <Flash erro={erro} />
      <ClienteForm action={criarCliente} label="Cadastrar cliente" />
    </main>
  );
}
