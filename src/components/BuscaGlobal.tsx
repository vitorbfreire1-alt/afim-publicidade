"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

interface Grupo {
  titulo: string;
  itens: { titulo: string; detalhe?: string; href: string }[];
}

/** Busca geral: abre com Ctrl/⌘+K ou pelo botão; setas navegam, Enter abre, Esc fecha. */
export default function BuscaGlobal({ variante }: { variante: "lateral" | "icone" }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [indice, setIndice] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const termoOk = q.trim().length >= 2;
  const visiveis = termoOk ? grupos : [];
  const planos = visiveis.flatMap((g) => g.itens);
  const fechar = useCallback(() => {
    setAberto(false);
    setQ("");
    setGrupos([]);
    setIndice(0);
  }, []);

  useEffect(() => {
    // O atalho fica só na cópia do menu lateral, para não abrir duas buscas ao mesmo tempo.
    if (variante !== "lateral") return;
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto((v) => !v);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [variante]);

  useEffect(() => {
    if (aberto) inputRef.current?.focus();
  }, [aberto]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setCarregando(true);
      try {
        const r = await fetch(`/api/busca?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        if (r.ok) {
          setGrupos((await r.json()).grupos);
          setIndice(0);
        }
      } catch {
        /* cancelada */
      } finally {
        setCarregando(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  const abrir = (href: string) => {
    fechar();
    router.push(href);
  };

  return (
    <>
      {variante === "lateral" ? (
        <button type="button" onClick={() => setAberto(true)} className="mb-4 flex w-full items-center gap-2 rounded-xl border border-line bg-white/[0.04] px-3 py-2.5 text-sm text-ink-faint transition-colors hover:border-gold/50">
          <Search className="size-4" /> Buscar
          <kbd className="ml-auto rounded border border-line px-1.5 text-[0.65rem]">Ctrl K</kbd>
        </button>
      ) : (
        <button type="button" onClick={() => setAberto(true)} className="btn btn-sm !px-2.5" aria-label="Buscar">
          <Search className="size-4" />
        </button>
      )}

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && fechar()} role="dialog" aria-modal="true" aria-label="Busca geral">
          <div className="card w-full max-w-xl !bg-[#0e0e12] p-3">
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <input
                ref={inputRef}
                className="input !pl-10"
                placeholder="Cliente, contrato (#12), ponto, proposta, despesa…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") fechar();
                  else if (e.key === "ArrowDown") { e.preventDefault(); setIndice((i) => Math.min(i + 1, planos.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setIndice((i) => Math.max(i - 1, 0)); }
                  else if (e.key === "Enter" && planos[indice]) abrir(planos[indice].href);
                }}
              />
            </div>
            <div className="mt-2 max-h-[55vh] overflow-y-auto">
              {!termoOk && <p className="p-3 text-sm text-ink-faint">Digite ao menos 2 letras.</p>}
              {termoOk && !carregando && visiveis.length === 0 && <p className="p-3 text-sm text-ink-soft">Nada encontrado para “{q}”.</p>}
              {visiveis.map((g) => (
                <div key={g.titulo} className="mb-2">
                  <p className="px-3 pb-1 pt-2 text-[0.65rem] font-bold uppercase tracking-widest text-gold">{g.titulo}</p>
                  {g.itens.map((it) => {
                    const i = planos.indexOf(it);
                    return (
                      <Link key={it.href + it.titulo} href={it.href} onClick={(e) => { e.preventDefault(); abrir(it.href); }} onMouseEnter={() => setIndice(i)}
                        className={`block rounded-lg px-3 py-2 text-sm ${i === indice ? "bg-gold/15 text-gold-soft" : "text-ink"}`}>
                        <span className="block truncate font-medium">{it.titulo}</span>
                        {it.detalhe && <span className="block truncate text-xs text-ink-soft">{it.detalhe}</span>}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
