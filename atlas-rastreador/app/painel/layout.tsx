import Link from "next/link";
import { AtlasLogo } from "@/components/Logo";
import { LogoutButton } from "./LogoutButton";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="atlas-hero px-6 py-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 items-center gap-4 text-center md:text-left">
          <div>
            <h1 className="font-display text-3xl">
              ATLAS <span className="atlas-gold">RASTREADOR</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: "#ffe6a3" }}>
              Monitoramento e segurança · Atlas Performance Group
            </p>
          </div>
          <div className="flex flex-col items-center order-first md:order-none">
            <AtlasLogo size="md" />
            <div className="atlas-hero-divider" />
          </div>
          <nav className="flex items-center justify-center md:justify-end gap-3 text-sm font-bold">
            <Link href="/painel" className="atlas-btn-secondary">
              Painel
            </Link>
            <Link href="/painel/historico" className="atlas-btn-secondary">
              Histórico
            </Link>
            <Link href="/painel/logs" className="atlas-btn-secondary">
              Logs
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto p-6">{children}</main>
    </div>
  );
}
