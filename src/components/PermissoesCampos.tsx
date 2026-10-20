"use client";

import { useState } from "react";
import { GRUPOS_PERMISSOES, MODELOS, normalizar, PERMISSOES, type ModeloId, type Permissao } from "@/lib/permissoes";

/**
 * Escolha do modelo e das permissões de um usuário. Trocar o modelo preenche as caixas; depois dá para ajustar uma a uma.
 * Envia os campos `modelo` e `permissoes` (uma por caixa marcada).
 */
export default function PermissoesCampos({ modeloInicial, permissoesIniciais }: { modeloInicial: ModeloId; permissoesIniciais: string[] }) {
  const [modelo, setModelo] = useState<ModeloId>(modeloInicial);
  const [marcadas, setMarcadas] = useState<Set<Permissao>>(new Set(normalizar(permissoesIniciais)));
  const dono = modelo === "DONO";
  const atual = MODELOS.find((m) => m.id === modelo)!;

  const escolherModelo = (id: ModeloId) => {
    setModelo(id);
    setMarcadas(new Set(MODELOS.find((m) => m.id === id)!.permissoes));
  };
  const alternar = (p: Permissao) =>
    setMarcadas((anterior) => {
      const novo = new Set(anterior);
      if (!novo.delete(p)) novo.add(p);
      return new Set(normalizar([...novo])); // mantém as dependências (ex.: despesas → valores)
    });
  // "Ver valores" não pode ser desmarcado enquanto outra permissão financeira depender dele.
  const exigidaPorOutra = (p: Permissao) => p === "valores" && normalizar([...marcadas].filter((x) => x !== "valores")).includes("valores");

  return (
    <div className="grid gap-4 sm:col-span-2">
      <div>
        <label className="label" htmlFor="modelo">Modelo de acesso</label>
        <select className="input" id="modelo" name="modelo" value={modelo} onChange={(e) => escolherModelo(e.target.value as ModeloId)}>
          {MODELOS.map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
        </select>
        <p className="mt-1 text-xs text-ink-faint">{atual.descricao}</p>
      </div>

      {dono ? (
        <p className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm text-gold-soft">O Dono sempre tem acesso a tudo, inclusive usuários, configurações, histórico e backup.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {GRUPOS_PERMISSOES.map((g) => (
            <fieldset key={g.titulo} className="rounded-xl border border-line p-3">
              <legend className="px-1 text-xs font-bold uppercase tracking-widest text-gold">{g.titulo}</legend>
              {g.itens.map((i) => (
                <label key={i.chave} className="flex items-start gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    name="permissoes"
                    value={i.chave}
                    checked={marcadas.has(i.chave)}
                    disabled={exigidaPorOutra(i.chave)}
                    onChange={() => alternar(i.chave)}
                    className="mt-1 size-4 shrink-0 accent-[#d4a62a]"
                  />
                  <span>
                    {i.rotulo}
                    {i.ajuda && <span className="block text-xs text-ink-faint">{i.ajuda}</span>}
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      )}
      {/* Campos desabilitados não são enviados: garante que a dependência "valores" chegue ao servidor. */}
      {!dono && marcadas.has("valores") && exigidaPorOutra("valores") && <input type="hidden" name="permissoes" value="valores" />}
      {dono && PERMISSOES.map((p) => <input key={p} type="hidden" name="permissoes" value={p} />)}
    </div>
  );
}
