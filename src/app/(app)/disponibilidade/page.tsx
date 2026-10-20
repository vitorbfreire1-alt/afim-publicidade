import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { picoDeOcupacao } from "@/lib/cotas";
import { hoje } from "@/lib/format";
import { TIPOS, TIPO_LABEL, isTipo } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Disponibilidade" };

const MESES = 12;
const chave = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const deslocar = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

export default async function Disponibilidade({ searchParams }: { searchParams: Promise<{ de?: string; tipo?: string }> }) {
  const [, sp] = await Promise.all([requireUser("disponibilidade"), searchParams]);
  const tipo = isTipo(sp.tipo) ? sp.tipo : "LED";
  const h = hoje();
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(sp.de ?? "");
  const inicio = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 1));
  const meses = Array.from({ length: MESES }, (_, i) => deslocar(inicio, i));
  const fmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });

  const pontos = await prisma.ponto.findMany({
    where: { ativo: true, tipo },
    orderBy: { nome: "asc" },
    include: { contratos: { where: { contrato: { status: "ATIVO" } }, select: { inicio: true, fim: true } } },
  });

  return (
    <main>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1>Disponibilidade</h1>
        <div className="flex gap-2">
          <Link className="btn btn-sm" href={`/disponibilidade?tipo=${tipo}&de=${chave(deslocar(inicio, -6))}`}><ChevronLeft className="size-4" /> Anterior</Link>
          <Link className="btn btn-sm" href={`/disponibilidade?tipo=${tipo}`}>Hoje</Link>
          <Link className="btn btn-sm" href={`/disponibilidade?tipo=${tipo}&de=${chave(deslocar(inicio, 6))}`}>Próximo <ChevronRight className="size-4" /></Link>
        </div>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {TIPOS.map((t) => (
          <Link key={t} href={`/disponibilidade?tipo=${t}${m ? `&de=${sp.de}` : ""}`} className={`btn btn-sm whitespace-nowrap ${t === tipo ? "btn-gold" : ""}`}>{TIPO_LABEL[t]}</Link>
        ))}
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="sticky left-0 z-[1] bg-[#0e0e12]">Ponto</th>
              {meses.map((d) => <th key={chave(d)} className="text-center">{fmt.format(d).replace(".", "").replace(" de ", "/")}</th>)}
            </tr>
          </thead>
          <tbody>
            {pontos.length === 0 && <tr><td colSpan={MESES + 1} className="text-ink-soft">Nenhum ponto cadastrado neste tipo.</td></tr>}
            {pontos.map((p) => (
              <tr key={p.id}>
                <td className="sticky left-0 z-[1] whitespace-nowrap bg-[#0e0e12] font-medium">
                  <Link href={`/pontos/${p.id}`} className="hover:text-gold-soft">{p.nome}</Link>
                  <span className="block text-xs text-ink-faint">{p.cotas ? `${p.cotas} cota(s)` : "sem limite"}</span>
                </td>
                {meses.map((d) => {
                  const fim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
                  const ocupadas = picoDeOcupacao(p.contratos, { inicio: d, fim });
                  const cheio = p.cotas ? ocupadas >= p.cotas : false;
                  const cor = ocupadas === 0 ? "text-good bg-good/10" : cheio ? "text-danger bg-danger/10" : "text-warn bg-warn/10";
                  const texto = p.cotas ? `${ocupadas}/${p.cotas}` : ocupadas === 0 ? "livre" : String(ocupadas);
                  return (
                    <td key={chave(d)} className="p-1 text-center">
                      <span className={`block rounded-lg px-2 py-1.5 text-xs font-semibold ${cor}`} title={cheio ? "Lotado" : ocupadas === 0 ? "Livre" : "Parcialmente ocupado"}>{texto}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        <span className="text-good">Verde</span> = livre · <span className="text-warn">âmbar</span> = com clientes (ainda há vaga) · <span className="text-danger">vermelho</span> = lotado. Em pontos sem limite de cotas, o número é a quantidade de clientes no mês.
      </p>
    </main>
  );
}
