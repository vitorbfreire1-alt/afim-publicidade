import { desfazerRecebimento, receberParcela } from "@/app/actions/parcelas";
import { FORMAS, FORMA_LABEL } from "@/lib/labels";
import { dateBR, isoDate, hoje } from "@/lib/format";
import type { FormaPagamento } from "@prisma/client";

interface Props {
  id: string;
  valor: number;
  forma: FormaPagamento;
  volta: string;
  pagoEm: Date | null;
  formaRecebida: FormaPagamento | null;
  pode: boolean;
}

/** Botão "Receber" (abre um mini formulário) ou o resumo do recebimento com opção de desfazer. */
export default function ReceberParcela({ id, valor, forma, volta, pagoEm, formaRecebida, pode }: Props) {
  if (pagoEm) {
    return (
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <span>
          {dateBR(pagoEm)} · {formaRecebida ? FORMA_LABEL[formaRecebida] : ""}
        </span>
        {pode && (
          <form action={desfazerRecebimento.bind(null, id, volta)}>
            <button className="btn btn-sm btn-danger" type="submit">Desfazer</button>
          </form>
        )}
      </div>
    );
  }
  if (!pode) return <span className="text-xs text-ink-faint">—</span>;

  return (
    <details>
      <summary className="btn btn-sm btn-gold cursor-pointer list-none">Receber</summary>
      <form action={receberParcela.bind(null, id, volta)} className="card mt-2 grid min-w-64 gap-2 p-3">
        <div>
          <label className="label">Data</label>
          <input className="input" type="date" name="pagoEm" defaultValue={isoDate(hoje())} required />
        </div>
        <div>
          <label className="label">Valor recebido</label>
          <input className="input" name="valorPago" inputMode="decimal" defaultValue={valor.toFixed(2).replace(".", ",")} required />
        </div>
        <div>
          <label className="label">Forma</label>
          <select className="input" name="formaRecebida" defaultValue={forma}>
            {FORMAS.map((f) => (
              <option key={f} value={f}>{FORMA_LABEL[f]}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-gold" type="submit">Confirmar recebimento</button>
      </form>
    </details>
  );
}
