import { Download, ShieldAlert } from "lucide-react";
import Flash from "@/components/Flash";
import { zerarDados } from "@/app/actions/dados";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dados e backup" };

const dataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function Dados({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [, sp] = await Promise.all([requireUser("DONO"), searchParams]);
  const [backups, contagem] = await Promise.all([
    prisma.auditoria.findMany({ where: { acao: "baixou backup" }, orderBy: { criadoEm: "desc" }, take: 5 }),
    Promise.all([prisma.cliente.count(), prisma.ponto.count(), prisma.contrato.count(), prisma.parcela.count(), prisma.despesa.count(), prisma.arquivo.count()]),
  ]);
  const [clientes, pontos, contratos, parcelas, despesas, arquivos] = contagem;

  return (
    <main className="max-w-3xl space-y-5">
      <Flash erro={sp.erro} ok={sp.ok} />
      <h1>Dados e backup</h1>

      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold text-gold-soft">Backup (cópia de segurança)</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Baixe uma cópia de todos os dados e guarde em um lugar seguro (por exemplo, no Google Drive da empresa). Recomendo fazer toda semana e sempre antes de mudanças grandes.
          Hoje: {clientes} cliente(s), {pontos} ponto(s), {contratos} contrato(s), {parcelas} parcela(s), {despesas} despesa(s), {arquivos} arquivo(s).
        </p>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-gold" href="/api/backup"><Download className="size-4" /> Baixar backup</a>
          <a className="btn" href="/api/backup?anexos=1"><Download className="size-4" /> Baixar com anexos (fotos e PDFs)</a>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          O arquivo (.json) tem os dados, mas não tem as senhas. Para restaurar um backup, fale comigo. O sistema ainda não tem botão de restauração, para evitar apagar dados por engano.
        </p>
        {backups.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="label">Últimos backups baixados</p>
            <ul className="text-sm text-ink-soft">
              {backups.map((b) => <li key={b.id}>{dataHora.format(b.criadoEm)} · {b.usuarioNome} · {b.resumo}</li>)}
            </ul>
          </div>
        )}
      </section>

      <section className="card border-danger/40 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-danger"><ShieldAlert className="size-4" /> Zerar dados de teste</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Para começar a usar com dados reais, apague o que foi cadastrado nos testes. <strong>Não tem volta:</strong> baixe um backup antes. Usuários, configurações e o histórico de alterações são mantidos.
        </p>
        <form action={zerarDados} className="grid gap-3">
          <fieldset className="grid gap-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="radio" name="modo" value="movimentos" className="mt-1 accent-[#d4a62a]" />
              <span><strong>Apagar só as movimentações</strong> — contratos, parcelas, despesas, propostas, acordos, ocorrências, arquivos e metas. Mantém clientes e pontos.</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="modo" value="tudo" className="mt-1 accent-[#d4a62a]" />
              <span><strong>Apagar tudo</strong> — as movimentações acima e também todos os clientes e pontos.</span>
            </label>
          </fieldset>
          <div>
            <label className="label" htmlFor="confirmacao">Para confirmar, digite APAGAR</label>
            <input className="input max-w-xs" id="confirmacao" name="confirmacao" autoComplete="off" placeholder="APAGAR" />
          </div>
          <div><button className="btn btn-danger" type="submit">Apagar dados</button></div>
        </form>
      </section>
    </main>
  );
}
