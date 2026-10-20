"use client";

import { useMemo, useState } from "react";
import { criarAcordo } from "@/app/actions/acordos";
import { maskDinheiro } from "@/lib/mask";
import { parseMoney } from "@/lib/format";

export interface ParcelaVencida {
  id: string;
  rotulo: string; // "3/12 · venceu 10/09/2026 (39 dias)"
  atualizado: number; // com multa e juros
}

const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const valor = (txt: string) => {
  const n = txt.trim() ? parseMoney(txt) : 0;
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

/** Formulário de acordo com prévia: total escolhido, desconto, entrada e valor de cada parcela. */
export default function FormAcordo({ contratoId, parcelas, hojeISO, mesQueVemISO }: { contratoId: string; parcelas: ParcelaVencida[]; hojeISO: string; mesQueVemISO: string }) {
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set(parcelas.map((p) => p.id)));
  const [desconto, setDesconto] = useState("");
  const [entrada, setEntrada] = useState("");
  const [n, setN] = useState(3);

  const resumo = useMemo(() => {
    const total = parcelas.filter((p) => marcadas.has(p.id)).reduce((s, p) => s + Math.round(p.atualizado * 100), 0);
    const acordado = total - valor(desconto);
    const saldo = acordado - valor(entrada);
    const base = n > 0 ? Math.floor(Math.max(saldo, 0) / n) : 0;
    return { total, acordado, saldo, base, ultima: Math.max(saldo, 0) - base * (n - 1), erro: acordado <= 0 ? "O desconto zera a dívida." : saldo < 0 ? "A entrada é maior que o acordo." : "" };
  }, [parcelas, marcadas, desconto, entrada, n]);

  const alternar = (id: string) =>
    setMarcadas((a) => {
      const novo = new Set(a);
      if (!novo.delete(id)) novo.add(id);
      return novo;
    });

  return (
    <form action={criarAcordo.bind(null, contratoId)} className="mt-3 grid gap-4 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="label">Parcelas vencidas a renegociar (valores com multa e juros)</legend>
        {parcelas.map((p) => (
          <label key={p.id} className="flex min-h-10 items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <input type="checkbox" name="parcelaIds" value={p.id} checked={marcadas.has(p.id)} onChange={() => alternar(p.id)} className="size-4 accent-[#d4a62a]" />
              {p.rotulo}
            </span>
            <span className="tabular-nums text-ink-soft">{reais(Math.round(p.atualizado * 100))}</span>
          </label>
        ))}
      </fieldset>

      <div>
        <label className="label" htmlFor="desconto">Desconto (R$)</label>
        <input className="input" id="desconto" name="desconto" inputMode="decimal" placeholder="0,00" value={desconto} onChange={(e) => setDesconto(maskDinheiro(e.target.value))} />
      </div>
      <div>
        <label className="label" htmlFor="entrada">Entrada (R$, opcional)</label>
        <input className="input" id="entrada" name="entrada" inputMode="decimal" placeholder="0,00" value={entrada} onChange={(e) => setEntrada(maskDinheiro(e.target.value))} />
      </div>
      <div>
        <label className="label" htmlFor="entradaData">Data da entrada</label>
        <input className="input" id="entradaData" name="entradaData" type="date" defaultValue={hojeISO} />
      </div>
      <div>
        <label className="label" htmlFor="numParcelas">Nº de parcelas do saldo</label>
        <input className="input" id="numParcelas" name="numParcelas" type="number" min={1} max={60} value={n} onChange={(e) => setN(Math.max(1, Number(e.target.value) || 1))} />
      </div>
      <div>
        <label className="label" htmlFor="primeiroVenc">Vencimento da 1ª parcela</label>
        <input className="input" id="primeiroVenc" name="primeiroVenc" type="date" defaultValue={mesQueVemISO} />
      </div>
      <div>
        <label className="label" htmlFor="obsAcordo">Observações</label>
        <input className="input" id="obsAcordo" name="observacoes" />
      </div>

      <div className="card sm:col-span-2 grid gap-1 p-4 text-sm">
        <p className="flex justify-between"><span className="text-ink-soft">Dívida com encargos</span><strong>{reais(resumo.total)}</strong></p>
        <p className="flex justify-between"><span className="text-ink-soft">Desconto</span><strong>− {reais(valor(desconto))}</strong></p>
        <p className="flex justify-between border-t border-line pt-1"><span className="text-ink-soft">Total acordado</span><strong className="text-gold-soft">{reais(resumo.acordado)}</strong></p>
        {resumo.saldo > 0 && (
          <p className="text-xs text-ink-soft">
            Saldo de {reais(resumo.saldo)} em {n}x de {reais(resumo.base)}{resumo.ultima !== resumo.base && ` (última de ${reais(resumo.ultima)})`}
          </p>
        )}
        {resumo.erro && <p className="text-xs text-danger">{resumo.erro}</p>}
      </div>

      <div className="sm:col-span-2">
        <button className="btn btn-gold" type="submit" disabled={!marcadas.size || Boolean(resumo.erro)}>Criar acordo</button>
      </div>
    </form>
  );
}
