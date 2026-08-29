"use client";

import { useRef, useState } from "react";

export function ImportCsvForm({ clientId, onImported }: { clientId: string; onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isError, setIsError] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    setMessage(null);
    setWarnings([]);
    setIsError(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/clients/${clientId}/import`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setIsError(true);
        setMessage(data.error ?? "Falha ao importar CSV.");
        setWarnings(data.warnings ?? []);
        return;
      }
      setMessage(
        `Importado: ${data.rowsParsed} linha(s) — ${data.inserted} nova(s), ${data.updated} atualizada(s).`
      );
      setWarnings(data.warnings ?? []);
      onImported();
    } catch {
      setIsError(true);
      setMessage("Erro de rede ao importar o CSV.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="atlas-btn-ghost cursor-pointer inline-flex items-center gap-2 w-fit">
        {loading ? "Importando..." : "Importar CSV do Meta Ads"}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>
      {message && (
        <p className="text-xs font-semibold" style={{ color: isError ? "var(--red-600)" : "#2fa64c" }}>
          {message}
        </p>
      )}
      {warnings.map((w, i) => (
        <p key={i} className="text-xs" style={{ color: "var(--ink-soft)" }}>
          ⚠️ {w}
        </p>
      ))}
    </div>
  );
}
