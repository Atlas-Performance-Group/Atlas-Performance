"use client";

import { useState } from "react";
import type { Client } from "@/lib/data";
import type { DateRange } from "@/lib/dateRanges";
import type { VisibleSections } from "@/lib/types";
import { DateRangePicker } from "./DateRangePicker";
import { Portal } from "./Portal";

const SECTION_LABELS: { key: keyof VisibleSections; label: string }[] = [
  { key: "kpis", label: "KPIs principais" },
  { key: "indicators", label: "Indicadores detalhados" },
  { key: "chart", label: "Gráfico de evolução diária" },
  { key: "dailyEvolution", label: "Evolução diária (detalhamento por dia)" },
  { key: "table", label: "Tabela dia a dia" },
  { key: "insights", label: "Análise e recomendações" },
];

export function GenerateLinkModal({
  clients,
  defaultClientId,
  defaultRange,
  onClose,
  onCreated,
}: {
  clients: Client[];
  defaultClientId: string | null;
  defaultRange: DateRange;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
    defaultClientId ? [defaultClientId] : []
  );
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [sections, setSections] = useState<VisibleSections>({
    kpis: true,
    indicators: true,
    chart: true,
    dailyEvolution: true,
    table: true,
    insights: true,
  });
  const [mode, setMode] = useState<"live" | "frozen">("live");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleClient(id: string) {
    setSelectedClientIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientIds: selectedClientIds,
          dateStart: range.start,
          dateEnd: range.end,
          visibleSections: sections,
          mode,
          label: label || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível gerar o link.");
        return;
      }
      const url = `${window.location.origin}/c/${data.link.token}`;
      setCreatedUrl(url);
      onCreated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Portal>
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(33,0,0,0.55)" }}
      onClick={onClose}
    >
      <div className="atlas-card max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl mb-4">
          Gerar Link para o <span className="atlas-gold">Cliente</span>
        </h2>

        {createdUrl ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
              Link gerado com sucesso. Copie e envie para o cliente.
            </p>
            <div className="flex gap-2">
              <input readOnly className="atlas-input flex-1" value={createdUrl} onClick={(e) => (e.target as HTMLInputElement).select()} />
              <button
                type="button"
                className="atlas-btn-primary"
                onClick={async () => {
                  await navigator.clipboard.writeText(createdUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
            <button type="button" className="atlas-btn-ghost w-fit" onClick={onClose}>
              Fechar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <div className="text-xs font-bold uppercase mb-2" style={{ color: "var(--ink-soft)" }}>
                Cliente(s)
              </div>
              <div className="flex flex-wrap gap-2">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleClient(c.id)}
                    className="text-sm font-bold px-3 py-1.5 rounded-full"
                    style={{
                      background: selectedClientIds.includes(c.id) ? "var(--gold-400)" : "transparent",
                      color: selectedClientIds.includes(c.id) ? "var(--red-950)" : "var(--ink-soft)",
                      border: `1px solid ${selectedClientIds.includes(c.id) ? "var(--gold-500)" : "var(--line-soft)"}`,
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase mb-2" style={{ color: "var(--ink-soft)" }}>
                Período visível
              </div>
              <DateRangePicker value={range} onChange={setRange} />
            </div>

            <div>
              <div className="text-xs font-bold uppercase mb-2" style={{ color: "var(--ink-soft)" }}>
                Seções visíveis
              </div>
              <div className="flex flex-col gap-2">
                {SECTION_LABELS.map(({ key, label: sectionLabel }) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sections[key]}
                      onChange={(e) => setSections((prev) => ({ ...prev, [key]: e.target.checked }))}
                    />
                    {sectionLabel}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase mb-2" style={{ color: "var(--ink-soft)" }}>
                Modo do link
              </div>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={mode === "live"} onChange={() => setMode("live")} />
                  Ao vivo (atualiza com novos dados importados no mesmo período)
                </label>
              </div>
              <div className="flex gap-3 text-sm mt-1">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={mode === "frozen"} onChange={() => setMode("frozen")} />
                  Fixo (congela os dados de agora)
                </label>
              </div>
            </div>

            <input
              placeholder="Rótulo interno (opcional, ex: Relatório semanal Binnos)"
              className="atlas-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />

            {error && (
              <p className="text-sm font-semibold" style={{ color: "var(--red-600)" }}>
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button type="button" className="atlas-btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="button"
                className="atlas-btn-primary"
                disabled={loading || selectedClientIds.length === 0}
                onClick={handleSubmit}
              >
                {loading ? "Gerando..." : "Gerar link"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </Portal>
  );
}
