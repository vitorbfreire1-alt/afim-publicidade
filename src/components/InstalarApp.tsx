"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CHAVE = "afim-instalar-dispensado";

type Ambiente = { instalado: boolean; ios: boolean };

function lerAmbiente(): Ambiente {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return { instalado: standalone, ios };
}

/**
 * Convite para instalar o aplicativo.
 * - `banner`: faixa discreta no topo, só no celular, que o usuário pode dispensar.
 * - `cartao`: bloco fixo na página "Minha conta", com o passo a passo de cada aparelho.
 */
export default function InstalarApp({ variante }: { variante: "banner" | "cartao" }) {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [amb, setAmb] = useState<Ambiente | null>(null);
  const [dispensado, setDispensado] = useState(true);

  useEffect(() => {
    // lê o aparelho só no navegador (no servidor não existe window)
    const inicio = setTimeout(() => {
      setAmb(lerAmbiente());
      try {
        setDispensado(localStorage.getItem(CHAVE) === "1");
      } catch {
        setDispensado(false);
      }
    }, 0);
    const antes = (e: Event) => {
      e.preventDefault(); // guarda o convite para mostrar no momento certo
      setEvento(e as EventoInstalar);
    };
    const depois = () => setAmb((a) => (a ? { ...a, instalado: true } : a));
    window.addEventListener("beforeinstallprompt", antes);
    window.addEventListener("appinstalled", depois);
    return () => {
      clearTimeout(inicio);
      window.removeEventListener("beforeinstallprompt", antes);
      window.removeEventListener("appinstalled", depois);
    };
  }, []);

  if (!amb) return null;

  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") setAmb({ ...amb, instalado: true });
    setEvento(null);
  };
  const dispensar = () => {
    setDispensado(true);
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {
      /* sem armazenamento: só some até recarregar */
    }
  };

  if (variante === "banner") {
    if (amb.instalado || dispensado || (!evento && !amb.ios)) return null;
    return (
      <div className="no-print mb-4 flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm lg:hidden" role="note">
        <Download aria-hidden className="size-5 shrink-0 text-gold-soft" />
        <p className="min-w-0 flex-1 text-gold-soft">
          {evento ? "Instale o app da AFIM na tela inicial." : "Para instalar: toque em Compartilhar e depois em “Adicionar à Tela de Início”."}
        </p>
        {evento && <button type="button" onClick={instalar} className="btn btn-sm btn-gold">Instalar</button>}
        <button type="button" onClick={dispensar} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-soft hover:text-ink" aria-label="Dispensar aviso">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <section className="card p-5">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-soft"><Download className="size-4" /> Aplicativo no celular</h2>
      {amb.instalado ? (
        <p className="text-sm text-good">✔ O aplicativo já está instalado neste aparelho.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-soft">Coloque o ícone da AFIM na tela inicial: o sistema abre em tela cheia, como um aplicativo.</p>
          {evento && <button type="button" onClick={instalar} className="btn btn-gold mb-3">Instalar aplicativo</button>}
          <ol className="space-y-2 text-sm text-ink-soft">
            <li><strong className="text-ink">iPhone (Safari):</strong> toque em <Share className="mx-0.5 inline size-4 align-text-bottom" /> <em>Compartilhar</em> e depois em <SquarePlus className="mx-0.5 inline size-4 align-text-bottom" /> <em>Adicionar à Tela de Início</em>.</li>
            <li><strong className="text-ink">Android (Chrome):</strong> toque nos três pontinhos ⋮ e depois em <em>Instalar aplicativo</em> (ou <em>Adicionar à tela inicial</em>).</li>
            <li><strong className="text-ink">Computador (Chrome ou Edge):</strong> clique no ícone de instalar na barra de endereço.</li>
          </ol>
        </>
      )}
    </section>
  );
}
