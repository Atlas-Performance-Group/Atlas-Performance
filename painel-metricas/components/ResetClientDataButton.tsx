"use client";

import { useState } from "react";
import { Portal } from "./Portal";

export function ResetClientDataButton({
  clientId,
  clientName,
  onReset,
}: {
  clientId: string;
  clientName: string;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/metrics`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível zerar os dados.");
        return;
      }
      setOpen(false);
      setConfirmText("");
      onReset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="atlas-btn-ghost text-xs"
        style={{ color: "var(--red-600)", borderColor: "var(--red-600)" }}
        onClick={() => setOpen(true)}
      >
        Zerar dados do cliente
      </button>

      {open && (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            style={{ background: "rgba(33,0,0,0.55)" }}
            onClick={() => !loading && setOpen(false)}
          >
            <div className="atlas-card max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-display text-xl mb-2">
                Zerar Dados de <span className="atlas-gold">{clientName}</span>
              </h2>
              <p className="text-sm mb-4" style={{ color: "var(--ink-soft)" }}>
                Isso apaga permanentemente todo o histórico de métricas importado para{" "}
                <strong>{clientName}</strong> (todos os dias e períodos). Os links já gerados param de
                mostrar dados. Essa ação não pode ser desfeita.
              </p>
              <p className="text-xs font-bold uppercase mb-2" style={{ color: "var(--ink-soft)" }}>
                Digite &ldquo;{clientName}&rdquo; para confirmar
              </p>
              <input
                className="atlas-input w-full mb-4"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={clientName}
              />
              {error && (
                <p className="text-sm font-semibold mb-3" style={{ color: "var(--red-600)" }}>
                  {error}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="atlas-btn-ghost"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="atlas-btn-primary"
                  style={{ background: "var(--red-600)", color: "#fff8ec" }}
                  disabled={loading || confirmText !== clientName}
                  onClick={handleConfirm}
                >
                  {loading ? "Zerando..." : "Zerar dados"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
