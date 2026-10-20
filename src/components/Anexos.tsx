import { Trash2 } from "lucide-react";
import type { CategoriaArquivo, Prisma } from "@prisma/client";
import { enviarArquivo, excluirArquivo } from "@/app/actions/arquivos";
import { dateBR, hoje, isoDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import ConfirmButton from "./ConfirmButton";
import UploadArquivo from "./UploadArquivo";

export const CATEGORIA_ARQUIVO_LABEL: Record<CategoriaArquivo, string> = {
  FOTO_PONTO: "Foto do ponto",
  VEICULACAO: "Comprovação de veiculação",
  CONTRATO_ASSINADO: "Contrato assinado",
  COMPROVANTE: "Comprovante",
  OUTRO: "Outro",
};

interface Props {
  titulo: string;
  /** Quais registros listar e a quem os novos arquivos pertencem. */
  onde: Prisma.ArquivoWhereInput;
  dono: { contratoId?: string; pontoId?: string; ocorrenciaId?: string; clienteId?: string };
  categorias: CategoriaArquivo[];
  volta: string;
  podeEditar: boolean;
  comData?: boolean;
}

/** Lista de anexos (miniaturas/PDFs) de um registro e formulário de envio. */
export default async function Anexos({ titulo, onde, dono, categorias, volta, podeEditar, comData }: Props) {
  // `dados` (o conteúdo) fica de fora da listagem de propósito.
  const arquivos = await prisma.arquivo.findMany({
    where: onde,
    orderBy: [{ dataRef: "desc" }, { criadoEm: "desc" }],
    select: { id: true, nome: true, mime: true, tamanho: true, categoria: true, descricao: true, dataRef: true, enviadoPorNome: true, criadoEm: true },
  });

  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold text-gold-soft">{titulo}</h2>
      {arquivos.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum arquivo ainda.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {arquivos.map((a) => (
            <li key={a.id} className="overflow-hidden rounded-xl border border-line bg-white/[0.03]">
              <a href={`/api/arquivos/${a.id}`} target="_blank" rel="noopener noreferrer" className="block">
                {a.mime.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/arquivos/${a.id}`} alt={a.descricao ?? a.nome} loading="lazy" className="h-36 w-full object-cover" />
                ) : (
                  <span className="grid h-36 place-items-center text-sm font-semibold text-gold">PDF</span>
                )}
              </a>
              <div className="flex items-start justify-between gap-2 p-3 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{a.descricao || a.nome}</p>
                  <p className="text-ink-faint">
                    {CATEGORIA_ARQUIVO_LABEL[a.categoria]} · {dateBR(a.dataRef ?? a.criadoEm)}
                    {a.enviadoPorNome && ` · ${a.enviadoPorNome}`}
                  </p>
                </div>
                {podeEditar && (
                  <form action={excluirArquivo.bind(null, a.id, volta)}>
                    <ConfirmButton className="btn btn-sm btn-danger !min-h-8 !px-2" mensagem="Excluir este arquivo?">
                      <Trash2 className="size-3.5" aria-label="Excluir" />
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={enviarArquivo.bind(null, volta)} className="mt-4 grid gap-3 sm:grid-cols-2">
        {Object.entries(dono).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
        <div className="sm:col-span-2">
          <label className="label">Arquivo (foto ou PDF)</label>
          <UploadArquivo />
        </div>
        <div>
          <label className="label" htmlFor={`cat-${titulo}`}>Categoria</label>
          <select className="input" id={`cat-${titulo}`} name="categoria" defaultValue={categorias[0]}>
            {categorias.map((c) => <option key={c} value={c}>{CATEGORIA_ARQUIVO_LABEL[c]}</option>)}
          </select>
        </div>
        {comData ? (
          <div>
            <label className="label" htmlFor={`data-${titulo}`}>Data</label>
            <input className="input" id={`data-${titulo}`} name="dataRef" type="date" defaultValue={isoDate(hoje())} />
          </div>
        ) : (
          <input type="hidden" name="dataRef" value="" />
        )}
        <div className="sm:col-span-2">
          <label className="label" htmlFor={`desc-${titulo}`}>Descrição (opcional)</label>
          <input className="input" id={`desc-${titulo}`} name="descricao" />
        </div>
        <div className="sm:col-span-2">
          <button className="btn btn-gold" type="submit">Enviar arquivo</button>
        </div>
      </form>
    </section>
  );
}
