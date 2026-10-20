"use client";

import { useRef, useState } from "react";

const MAX_LADO = 1600;

/** Reduz fotos no navegador (lado maior 1600px, JPEG) antes de enviar, para caber no limite e economizar espaço. */
async function reduzir(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const escala = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Campo de arquivo que reduz a foto escolhida; use dentro de um <form> com a action de envio. */
export default function UploadArquivo({ name = "arquivo" }: { name?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState("");

  return (
    <div>
      <input
        ref={ref}
        className="input !py-2"
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        required
        onChange={async (e) => {
          const original = e.target.files?.[0];
          if (!original) return;
          const novo = await reduzir(original);
          if (novo !== original && ref.current) {
            const dt = new DataTransfer();
            dt.items.add(novo);
            ref.current.files = dt.files;
          }
          setInfo(`${novo.name} · ${(novo.size / 1024).toFixed(0)} KB${novo !== original ? " (reduzida)" : ""}`);
        }}
      />
      {info && <p className="mt-1 text-xs text-ink-faint">{info}</p>}
    </div>
  );
}
