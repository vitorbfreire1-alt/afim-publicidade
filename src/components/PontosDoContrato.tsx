"use client";

import { useState } from "react";
import MaskedInput from "./MaskedInput";

export interface GrupoPontos {
  titulo: string;
  pontos: { id: string; nome: string; clientesAtivos: number }[];
}

/** Escolha dos pontos do contrato; cada ponto marcado pede o seu valor mensal, início e prazo. */
export default function PontosDoContrato({ grupos, hojeISO }: { grupos: GrupoPontos[]; hojeISO: string }) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
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
                  {p.clientesAtivos > 0 && (
                    <span className="text-xs text-ink-faint">({p.clientesAtivos} cliente(s) ativo(s))</span>
                  )}
                </label>
                {ligado && (
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="label" htmlFor={`valor_${p.id}`}>Valor mensal (R$)</label>
                      <MaskedInput className="input" id={`valor_${p.id}`} name={`valor_${p.id}`} mask="dinheiro" placeholder="1.500,00" required />
                    </div>
                    <div>
                      <label className="label" htmlFor={`inicio_${p.id}`}>Início</label>
                      <input className="input" id={`inicio_${p.id}`} name={`inicio_${p.id}`} type="date" defaultValue={hojeISO} required />
                    </div>
                    <div>
                      <label className="label" htmlFor={`prazo_${p.id}`}>Prazo (meses)</label>
                      <input className="input" id={`prazo_${p.id}`} name={`prazo_${p.id}`} type="number" min={1} max={120} defaultValue={12} required />
                    </div>
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
