import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Botão "Abrir" no fim da linha de uma tabela; o rótulo acessível diz exatamente o que será aberto. */
export default function AbrirLink({ href, rotulo }: { href: string; rotulo: string }) {
  return (
    <Link href={href} aria-label={rotulo} title={rotulo} className="btn btn-sm whitespace-nowrap">
      Abrir <ArrowUpRight className="size-3.5" aria-hidden />
    </Link>
  );
}
