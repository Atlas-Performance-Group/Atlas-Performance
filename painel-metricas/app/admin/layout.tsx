import Link from "next/link";
import { AtlasLogo } from "@/components/Logo";
import { LogoutButton } from "./LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="atlas-hero px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <AtlasLogo size="md" />
          <nav className="flex items-center gap-4 text-sm font-bold">
            <Link href="/admin" className="atlas-btn-secondary">
              Painel
            </Link>
            <Link href="/admin/links" className="atlas-btn-secondary">
              Links de Clientes
            </Link>
            <LogoutButton />
          </nav>
        </div>
        <h1 className="font-display text-3xl mt-4 max-w-6xl mx-auto">
          MÉTRICAS <span className="atlas-gold">ATLAS</span>
        </h1>
        <p className="max-w-6xl mx-auto text-sm mt-1" style={{ color: "#ffe6a3" }}>
          Painel interno · Atlas Performance Group
        </p>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto p-6">{children}</main>
    </div>
  );
}
