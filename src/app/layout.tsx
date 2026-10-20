import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import RegistrarSW from "@/components/RegistrarSW";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  title: { default: "AFIM Publicidade", template: "%s · AFIM Publicidade" },
  description: "Controle financeiro e gestão de clientes — locação de painéis de LED.",
  applicationName: "AFIM Publicidade",
  appleWebApp: { capable: true, title: "AFIM", statusBarStyle: "black" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#07070a", viewportFit: "cover", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${sora.variable}`}>
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
