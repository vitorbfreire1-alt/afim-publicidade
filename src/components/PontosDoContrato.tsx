"use client";

import { useState } from "react";
import MaskedInput from "./MaskedInput";

export interface GrupoPontos {
  titulo: string;
  pontos: { id: string; nome: string; ocupacao: string | null; lotado: boolean; cotas: number | null; bisemanal: boolean; producao: { item: string; label: string; valor: string; formato: string }[] }[];
}

/** Escolha dos pontos do contrato; cada ponto marcado pede o seu valor mensal, início e prazo. */
export default function PontosDoContrato({ grupos, hojeISO, inicial = {}, prazoPadrao = 12 }: {
  grupos: GrupoPontos[];
  hojeISO: string;
  /** Pontos já marcados, com o valor mensal sugerido (ex.: vindos de uma proposta). */
  inicial?: Record<string, string>;
  prazoPadrao?: number;
}) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set(Object.keys(inicial)));
  // Unidade do prazo de cada ponto (outdoor e triedro podem ser contratados por bi-semanas de 14 dias).
  const [unidades, setUnidades] = useState<Record<string, "meses" | "bisemanas">>({});
  const alternar = (id: string) =>
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(id)) novo.add(id);
      return novo;
    });

  return (
    <fieldset className="sm:col-span-2">
      <legend className="label">Pontos do contrato (um ponto pode ter vários clientes)</legend>
      {grupos.length === 0 && (
        <p className="text-sm text-ink-soft">Nenhum ponto cadastrado. Cadastre em Pontos → Novo ponto.</p>
      )}
      {grupos.map((g) => (
        <div key={g.titulo} className="mb-3">
          <p className="text-xs font-semibold text-gold">{g.titulo}</p>
          {g.pontos.map((p) => {
            const ligado = marcados.has(p.id);
            return (
              <div key={p.id} className={ligado ? "card my-2 p-3" : ""}>
                <label className="flex min-h-10 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="pontoIds"
                    value={p.id}
                    checked={ligado}
                    onChange={() => alternar(p.id)}
                    className="size-4 accent-[#d4a62a]"
                  />
                  {p.nome}
                  {p.ocupacao && (
                    <span className={`text-xs ${p.lotado ? "font-semibold text-danger" : "text-ink-faint"}`}>
                      ({p.ocupacao}{p.lotado && " · lotado"})
                    </span>
                  )}
                </label>
                {ligado && (
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="label" htmlFor={`valor_${p.id}`}>{p.bisemanal && unidades[p.id] === "bisemanas" ? "Valor por bi-semana (R$)" : "Valor mensal (R$)"}</label>
                      <MaskedInput className="input" id={`valor_${p.id}`} name={`valor_${p.id}`} mask="dinheiro" placeholder="1.500,00" defaultValue={inicial[p.id] ?? ""} required />
                    </div>
                    <div>
                      <label className="label" htmlFor={`inicio_${p.id}`}>Início</label>
                      <input className="input" id={`inicio_${p.id}`} name={`inicio_${p.id}`} type="date" defaultValue={hojeISO} required />
                    </div>
                    <div>
                      <label className="label" htmlFor={`prazo_${p.id}`}>Prazo ({unidades[p.id] === "bisemanas" ? "bi-semanas" : "meses"})</label>
                      <div className={p.bisemanal ? "grid gap-2" : ""}>
                        <input className="input min-w-0" id={`prazo_${p.id}`} name={`prazo_${p.id}`} type="number" min={1} max={unidades[p.id] === "bisemanas" ? 260 : 120} defaultValue={prazoPadrao} required />
                        {p.bisemanal && (
                          <select
                            className="input min-w-0"
                            name={`unidade_${p.id}`}
                            value={unidades[p.id] ?? "meses"}
                            onChange={(e) => setUnidades((u) => ({ ...u, [p.id]: e.target.value === "bisemanas" ? "bisemanas" : "meses" }))}
                            aria-label="Unidade do prazo"
                          >
                            <option value="meses">Meses</option>
                            <option value="bisemanas">Bi-semanas</option>
                          </select>
                        )}
                      </div>
                      {p.bisemanal && unidades[p.id] === "bisemanas" && <p className="mt-1 text-xs text-ink-faint">Cada bi-semana tem 14 dias. O valor é por bi-semana; o sistema calcula as parcelas.</p>}
                    </div>
                    {p.producao.length > 0 && (
                      <fieldset className="sm:col-span-3">
                        <legend className="label">Serviços de produção do formato {p.producao[0].formato} (cobrados do cliente, somados à 1ª parcela)</legend>
                        <div className="grid gap-2">
                          {p.producao.map((s) => (
                            <div key={s.item} className="grid grid-cols-[1fr_4rem_7rem] items-center gap-2 text-sm">
                              <label className="flex items-center gap-2">
                                <input type="checkbox" name={`prod_${p.id}_${s.item}`} className="size-4 accent-[#d4a62a]" />
                                {s.label}
                              </label>
                              <input className="input !py-1" name={`prodqtd_${p.id}_${s.item}`} type="number" min={1} max={99} defaultValue={1} aria-label={`Quantidade de ${s.label}`} title="Quantidade" />
                              <MaskedInput className="input !py-1" name={`prodval_${p.id}_${s.item}`} mask="dinheiro" defaultValue={s.valor} aria-label={`Valor unitário de ${s.label}`} title="Valor unitário (R$)" />
                            </div>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-ink-faint">Marque o que será cobrado. Quantidade e valor unitário podem ser ajustados (os preços vêm da tabela em Configurações).</p>
                      </fieldset>
                    )}
                    {p.cotas && (
                      <div className="grid gap-3 sm:col-span-3 sm:grid-cols-3">
                        <div>
                          <label className="label" htmlFor={`cotas_${p.id}`}>Cotas que ocupa (de {p.cotas})</label>
                          <input className="input" id={`cotas_${p.id}`} name={`cotas_${p.id}`} type="number" min={1} max={p.cotas} defaultValue={1} />
                        </div>
                        <label className="flex items-center gap-2 text-sm sm:col-span-2 sm:pt-6">
                          <input type="checkbox" name={`inteiro_${p.id}`} className="size-4 accent-[#d4a62a]" />
                          Reservar o ponto inteiro (todas as cotas)
                        </label>
                        <p className="text-xs text-ink-faint sm:col-span-3">Ex.: triedro de 6 cotas com 3 clientes, 2 cotas cada. No outdoor anual, marque o ponto inteiro.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </fieldset>
  );
}
