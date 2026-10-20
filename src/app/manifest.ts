import type { MetadataRoute } from "next";

/** Dados do aplicativo instalável (nome, ícones, cores e atalhos que aparecem ao segurar o ícone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AFIM Publicidade",
    short_name: "AFIM",
    description: "Controle financeiro e gestão de clientes — locação de painéis de LED.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07070a",
    theme_color: "#07070a",
    categories: ["business", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Carteira", url: "/carteira", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Clientes", url: "/clientes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
