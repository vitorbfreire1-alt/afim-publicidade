"use client";

import { useState } from "react";
import { MASKS, completaCentavos } from "@/lib/mask";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue"> {
  mask: keyof typeof MASKS;
  defaultValue?: string;
}

/** Input que formata enquanto digita (CPF/CNPJ, telefone ou dinheiro) e envia o valor já formatado no formulário. */
export default function MaskedInput({ mask, defaultValue = "", ...props }: Props) {
  const aplicar = MASKS[mask];
  const [valor, setValor] = useState(aplicar(defaultValue));
  return (
    <input
      {...props}
      value={valor}
      onChange={(e) => setValor(aplicar(e.target.value))}
      onBlur={mask === "dinheiro" ? () => setValor((v) => completaCentavos(v)) : undefined}
      inputMode={props.inputMode ?? (mask === "dinheiro" ? "decimal" : "numeric")}
    />
  );
}
