"use client";

import { useEffect } from "react";

/** Registra o serviço de apoio do aplicativo (só em produção; em desenvolvimento atrapalharia o recarregamento). */
export default function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((reg) => reg.update()).catch(() => {
      /* sem suporte ou bloqueado: o sistema segue funcionando normalmente, só não instala como aplicativo */
    });
  }, []);
  return null;
}
