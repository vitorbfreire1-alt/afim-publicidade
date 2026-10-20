"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type Estado = "carregando" | "sem-suporte" | "negado" | "inativo" | "ativo";

const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function chaveParaBytes(base64: string) {
  const b = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

async function inscricaoAtual() {
  const reg = await navigator.serviceWorker.ready;
  return { reg, sub: await reg.pushManager.getSubscription() };
}

/** Liga/desliga os avisos (vencimentos, atrasos, contratos terminando) neste aparelho. */
export default function AtivarNotificacoes() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const inicio = setTimeout(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !CHAVE_PUBLICA) return setEstado("sem-suporte");
      if (Notification.permission === "denied") return setEstado("negado");
      try {
        setEstado((await inscricaoAtual()).sub ? "ativo" : "inativo");
      } catch {
        setEstado("sem-suporte");
      }
    }, 0);
    return () => clearTimeout(inicio);
  }, []);

  const ativar = async () => {
    setOcupado(true);
    setMensagem("");
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setEstado(Notification.permission === "denied" ? "negado" : "inativo");
        return;
      }
      const { reg, sub: existente } = await inscricaoAtual();
      const sub = existente ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(CHAVE_PUBLICA) }));
      const r = await fetch("/api/push/inscrever", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) throw new Error();
      setEstado("ativo");
      setMensagem("Avisos ativados neste aparelho.");
    } catch {
      setMensagem("Não foi possível ativar. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  };

  const desativar = async () => {
    setOcupado(true);
    try {
      const { sub } = await inscricaoAtual();
      if (sub) {
        await fetch("/api/push/inscrever", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setEstado("inativo");
      setMensagem("Avisos desligados neste aparelho.");
    } finally {
      setOcupado(false);
    }
  };

  const testar = async () => {
    setOcupado(true);
    const r = await fetch("/api/push/teste", { method: "POST" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setMensagem(r?.ok && j.enviados > 0 ? "Teste enviado. Deve chegar em instantes." : (j.erro ?? "Não foi possível enviar o teste."));
    setOcupado(false);
  };

  return (
    <section className="card p-5">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-soft"><Bell className="size-4" /> Avisos no celular</h2>
      <p className="mb-3 text-sm text-ink-soft">Todo dia de manhã você recebe um resumo do que precisa de atenção: parcelas atrasadas ou a vencer, despesas, contratos terminando. Só aparece o que a sua permissão deixa ver.</p>
      {estado === "carregando" && <p className="text-sm text-ink-faint">Verificando…</p>}
      {estado === "sem-suporte" && <p className="text-sm text-ink-soft">Este aparelho ou navegador não aceita avisos. No iPhone, instale o aplicativo na Tela de Início primeiro e abra por ele.</p>}
      {estado === "negado" && <p className="text-sm text-warn">As notificações estão bloqueadas. Libere nas configurações do navegador/aparelho para este site e volte aqui.</p>}
      {estado === "inativo" && <button type="button" className="btn btn-gold" disabled={ocupado} onClick={ativar}><Bell className="size-4" /> Ativar avisos</button>}
      {estado === "ativo" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-good">✔ Avisos ativados neste aparelho.</span>
          <button type="button" className="btn btn-sm" disabled={ocupado} onClick={testar}>Enviar teste</button>
          <button type="button" className="btn btn-sm" disabled={ocupado} onClick={desativar}><BellOff className="size-4" /> Desligar</button>
        </div>
      )}
      {mensagem && <p className="mt-3 text-sm text-ink-soft" role="status">{mensagem}</p>}
    </section>
  );
}
