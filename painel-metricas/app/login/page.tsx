"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AtlasLogo } from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível entrar.");
        return;
      }
      const next = searchParams.get("next") || "/admin";
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen atlas-hero flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <AtlasLogo size="lg" />
        <form onSubmit={handleSubmit} className="atlas-card w-full p-6 flex flex-col gap-4">
          <h1 className="font-display text-xl">
            Painel <span className="atlas-gold">Interno</span>
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Acesso restrito à equipe Atlas Performance Group.
          </p>
          <input
            type="password"
            required
            autoFocus
            placeholder="Senha"
            className="atlas-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="text-sm font-semibold" style={{ color: "var(--red-600)" }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="atlas-btn-primary">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
