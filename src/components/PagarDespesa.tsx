import MaskedInput from "./MaskedInput";
import ConfirmButton from "./ConfirmButton";
import { desfazerPagamentoDespesa, excluirDespesa, pagarDespesa } from "@/app/actions/despesas";
import { dateBR, hoje, isoDate } from "@/lib/format";

interface Props {
  id: string;
  valor: number;
  volta: string;
  pagoEm: Date | null;
  emSerie: boolean;
}

/** Ações de uma despesa: pagar (mini formulário), desfazer pagamento e excluir. */
export default function PagarDespesa({ id, valor, volta, pagoEm, emSerie }: Props) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {pagoEm ? (
        <>
          <span className="py-2 text-xs text-ink-soft">Paga em {dateBR(pagoEm)}</span>
          <form action={desfazerPagamentoDespesa.bind(null, id, volta)}>
            <button className="btn btn-sm btn-danger" type="submit">Desfazer</button>
          </form>
        </>
      ) : (
        <details>
          <summary className="btn btn-sm btn-gold cursor-pointer list-none">Pagar</summary>
          <form action={pagarDespesa.bind(null, id, volta)} className="card mt-2 grid min-w-60 gap-2 p-3">
            <div>
              <label className="label">Data do pagamento</label>
              <input className="input" type="date" name="pagoEm" defaultValue={isoDate(hoje())} required />
            </div>
            <div>
              <label className="label">Valor pago</label>
              <MaskedInput className="input" name="valorPago" mask="dinheiro" defaultValue={valor.toFixed(2).replace(".", ",")} required />
            </div>
            <button className="btn btn-gold" type="submit">Confirmar pagamento</button>
          </form>
        </details>
      )}
      <form action={excluirDespesa.bind(null, id, volta, false)}>
        <ConfirmButton className="btn btn-sm btn-danger" mensagem="Excluir esta despesa?">Excluir</ConfirmButton>
      </form>
      {emSerie && !pagoEm && (
        <form action={excluirDespesa.bind(null, id, volta, true)}>
          <ConfirmButton className="btn btn-sm btn-danger" mensagem="Excluir esta despesa e as próximas não pagas da mesma repetição?">
            Excluir série
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
