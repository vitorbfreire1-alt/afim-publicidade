import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Uploads de fotos (já reduzidas no navegador) e PDFs pequenos; o limite da Vercel para o corpo é 4,5 MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      {
        // O serviço de apoio precisa ser sempre a versão mais nova.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" }, // ninguém pode embutir o sistema em outro site
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
