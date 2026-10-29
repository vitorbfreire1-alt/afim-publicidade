import Flash from "@/components/Flash";
import MaskedInput from "@/components/MaskedInput";
import { salvarConfig } from "@/app/actions/config";
import { salvarCustos } from "@/app/actions/custos";
import { requireUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { CUSTO_ITENS, CUSTO_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configurações" };

export default async function Configuracoes({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [, sp] = await Promise.all([requireUser("DONO"), searchParams]);
  const c = await getConfig();
  const todosCustos = await prisma.custoOutdoor.findMany();
  const ordem = (a: string, b: string) => parseFloat(a) * 10 + parseFloat(a.split("x")[1]) - (parseFloat(b) * 10 + parseFloat(b.split("x")[1]));
  const tabelaCustos = (tipo: "OUTDOOR" | "TRIEDRO", titulo: string, explicacao: string) => {
    const custos = todosCustos.filter((x) => x.tipo === tipo);
    const formatos = [...new Set(custos.map((x) => x.formato))].sort(ordem);
    const valorDe = (f: string, i: string) => custos.find((x) => x.formato === f && x.item === i)?.valor;
    return (
      <form action={salvarCustos.bind(null, tipo)} className="card mt-8 space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-gold-soft">{titulo}</h2>
          <p className="mt-1 text-xs text-ink-soft">{explicacao}</p>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Serviço</th>{formatos.map((f) => <th key={f}>{f}</th>)}<th>Novo formato</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-xs text-ink-faint">Formato</td>
                {formatos.map((f) => <td key={f} />)}
                <td><input className="input !py-1" name="novoFormato" placeholder="Ex.: 6x3" aria-label="Novo formato" /></td>
              </tr>
              {CUSTO_ITENS.map((i) => (
                <tr key={i}>
                  <td className="font-medium">{CUSTO_LABEL[i]}</td>
                  {formatos.map((f) => (
                    <td key={f}><input className="input !py-1" name={`v|${f}|${i}`} inputMode="decimal" aria-label={`${CUSTO_LABEL[i]} ${f}`} defaultValue={valorDe(f, i) != null ? Number(valorDe(f, i)).toFixed(2).replace(".", ",") : ""} /></td>
                  ))}
                  <td><input className="input !py-1" name={`v|__novo|${i}`} inputMode="decimal" aria-label={`${CUSTO_LABEL[i]} novo formato`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-gold" type="submit">Salvar tabela de custos ({tipo === "TRIEDRO" ? "triedro" : "outdoor"})</button>
      </form>
    );
  };
  const campo = (name: keyof typeof c, titulo: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={name}>{titulo}</label>
      <input className="input" id={name} name={name} defaultValue={(c[name] as string | null) ?? ""} {...extra} />
    </div>
  );

  return (
    <main className="max-w-3xl">
      <Flash erro={sp.erro} ok={sp.ok} />
      <h1 className="mb-5">Configurações</h1>
      <form action={salvarConfig} className="space-y-5">
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-sm font-semibold text-gold-soft sm:col-span-2">Dados da empresa (aparecem nos recibos e contratos)</h2>
          {campo("razaoSocial", "Razão social")}
          {campo("nomeFantasia", "Nome fantasia")}
          <div>
            <label className="label" htmlFor="cnpj">CNPJ</label>
            <MaskedInput className="input" id="cnpj" name="cnpj" mask="documento" defaultValue={c.cnpj ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="telefone">Telefone</label>
            <MaskedInput className="input" id="telefone" name="telefone" mask="telefone" type="tel" defaultValue={c.telefone ?? ""} />
          </div>
          <div className="sm:col-span-2">{campo("endereco", "Endereço")}</div>
          {campo("cidade", "Cidade / UF")}
          {campo("email", "E-mail", { type: "email" })}
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-sm font-semibold text-gold-soft sm:col-span-2">Atraso: multa e juros</h2>
          <div>
            <label className="label" htmlFor="multaPct">Multa por atraso (%)</label>
            <input className="input" id="multaPct" name="multaPct" inputMode="decimal" defaultValue={String(Number(c.multaPct))} required />
            <p className="mt-1 text-xs text-ink-faint">Cobrada uma vez sobre o valor da parcela vencida.</p>
          </div>
          <div>
            <label className="label" htmlFor="jurosMesPct">Juros ao mês (%)</label>
            <input className="input" id="jurosMesPct" name="jurosMesPct" inputMode="decimal" defaultValue={String(Number(c.jurosMesPct))} required />
            <p className="mt-1 text-xs text-ink-faint">Proporcional aos dias de atraso (mês de 30 dias).</p>
          </div>
          <p className="text-xs text-ink-soft sm:col-span-2">
            Exemplo com {Number(c.multaPct)}% de multa e {Number(c.jurosMesPct)}% de juros: parcela de R$ 1.000,00 com 15 dias de atraso fica em{" "}
            <strong className="text-gold-soft">
              R$ {(1000 + (1000 * Number(c.multaPct)) / 100 + ((1000 * Number(c.jurosMesPct)) / 100) * 0.5).toFixed(2).replace(".", ",")}
            </strong>
            .
          </p>
        </section>

        <button className="btn btn-gold" type="submit">Salvar configurações</button>
      </form>

      {tabelaCustos("OUTDOOR", "Custos do outdoor por formato", "Deixe em branco o serviço que não se aplica ao formato. Esses valores são usados para lançar as despesas de cada ponto de outdoor, conforme o formato cadastrado no ponto.")}
      {tabelaCustos("TRIEDRO", "Custos do triedro por formato", "Tabela própria dos triedros. Crie o formato do triedro na última coluna (ex.: 3x2), preencha os valores e salve. O formato precisa ser o mesmo cadastrado no ponto do triedro.")}
    </main>
  );
}
