"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidIp } from "@/lib/ipValidation";

export function IpSearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!isValidIp(trimmed)) {
      setError("Informe um endereço IPv4 ou IPv6 válido.");
      return;
    }
    setError(null);
    router.push(`/admin/rastreador/ip/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          className="atlas-input flex-1"
          placeholder="Pesquisar IP — ex: 8.8.8.8 ou 2001:4860:4860::8888"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button type="submit" className="atlas-btn-primary whitespace-nowrap">
          Pesquisar IP
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--red-600)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
