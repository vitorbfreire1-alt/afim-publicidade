"use client";

import { useState } from "react";
import MaskedInput from "./MaskedInput";

export interface GrupoPontosProposta {
  titulo: string;
  pontos: { id: string; nome: string }[];
}

/** Escolha dos pontos de uma proposta, cada um com o valor mensal oferecido. */
export default function PontosDaProposta({ grupos }: { grupos: GrupoPontosProposta[] }) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const alternar = (id: string) =>
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(id)) novo.add(id);
      return novo;
    });

  return (
    <fieldset className="sm:col-span-2">
      <legend className="label">Pontos oferecidos</legend>
      {grupos.map((g) => (
        <div key={g.titulo} className="mb-3">
          <p className="text-xs font-semibold text-gold">{g.titulo}</p>
          {g.pontos.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3">
              <label className="flex min-h-10 flex-1 items-center gap-2 text-sm">
                <input type="checkbox" name="pontoIds" value={p.id} checked={marcados.has(p.id)} onChange={() => alternar(p.id)} className="size-4 accent-[#d4a62a]" />
                {p.nome}
              </label>
              {marcados.has(p.id) && (
                <MaskedInput className="input !w-40" name={`valor_${p.id}`} mask="dinheiro" placeholder="Valor mensal" aria-label={`Valor mensal de ${p.nome}`} required />
              )}
            </div>
          ))}
        </div>
      ))}
    </fieldset>
  );
}
