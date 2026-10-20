import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Uploads de fotos (já reduzidas no navegador) e PDFs pequenos; o limite da Vercel para o corpo é 4,5 MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
