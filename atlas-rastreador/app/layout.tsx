import type { Metadata, Viewport } from "next";
import { Anton, Manrope } from "next/font/google";
import "./globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atlas Rastreador",
  description: "Monitoramento, auditoria e geolocalização aproximada de IP — Atlas Performance Group.",
  appleWebApp: {
    capable: true,
    title: "Atlas Rastreador",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#b40b0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${anton.variable} ${manrope.variable}`}>{children}</body>
    </html>
  );
}
