"use client";

import { Printer } from "lucide-react";

export default function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="no-print inline-flex items-center gap-2 rounded-lg bg-[#151515] px-4 py-2 text-sm font-semibold text-white hover:bg-black">
      <Printer className="size-4" /> Imprimir / salvar PDF
    </button>
  );
}
