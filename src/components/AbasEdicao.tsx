"use client";

import { useState } from "react";

export interface AbaEdicao {
  id: string;
  titulo: string;
  conteudo: React.ReactNode;
}

/** Abas do painel "Editar contrato": mostra uma seção de cada vez, para não misturar tudo na tela. */
export default function AbasEdicao({ abas }: { abas: AbaEdicao[] }) {
  const [ativa, setAtiva] = useState(abas[0]?.id);
  const atual = abas.find((a) => a.id === ativa) ?? abas[0];
  return (
    <div className="mt-4">
      <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto border-b border-white/10">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={a.id === atual.id}
            onClick={() => setAtiva(a.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition ${a.id === atual.id ? "border-gold text-gold" : "border-transparent text-ink-soft hover:text-ink"}`}
          >
            {a.titulo}
          </button>
        ))}
      </div>
      <div role="tabpanel">{atual.conteudo}</div>
    </div>
  );
}
