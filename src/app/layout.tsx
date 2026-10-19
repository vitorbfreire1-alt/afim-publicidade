import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AFIM Publicidade", template: "%s · AFIM Publicidade" },
  description: "Controle financeiro e gestão de clientes — locação de painéis de LED.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b0b0c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
