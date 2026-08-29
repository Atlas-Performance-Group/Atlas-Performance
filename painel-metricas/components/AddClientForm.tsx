"use client";

import { useState } from "react";

export function AddClientForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [businessLabel, setBusinessLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, businessLabel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar o cliente.");
        return;
      }
      setName("");
      setBusinessLabel("");
      setOpen(false);
      onCreated();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="atlas-btn-ghost" onClick={() => setOpen(true)}>
        + Novo cliente
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="atlas-card p-4 flex flex-col gap-3 max-w-sm">
      <input
        required
        placeholder="Nome do cliente"
        className="atlas-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Contexto (ex: película térmica inteligente)"
        className="atlas-input"
        value={businessLabel}
        onChange={(e) => setBusinessLabel(e.target.value)}
      />
      {error && (
        <p className="text-sm font-semibold" style={{ color: "var(--red-600)" }}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="atlas-btn-primary">
          {loading ? "Criando..." : "Criar"}
        </button>
        <button type="button" className="atlas-btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
