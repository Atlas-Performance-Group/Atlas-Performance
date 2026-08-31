"use client";

import { useState } from "react";
import type { Client, SharedLink } from "@/lib/data";
import type { DateRange } from "@/lib/dateRanges";
import { formatRangeLabel } from "@/lib/dateRanges";
import type { VisibleSections } from "@/lib/types";
import { DateRangePicker } from "./DateRangePicker";
import { Portal } from "./Portal";

const SECTION_LABELS: { key: keyof VisibleSections; label: string }[] = [
  { key: "kpis", label: "KPIs principais" },
  { key: "indicators", label: "Indicadores detalhados" },
  { key: "dailyEvolution", label: "Evolução diária (detalhamento por dia)" },
  { key: "table", label: "Tabela dia a dia" },
  { key: "insights", label: "Análise e recomendações" },
];

export function LinkDetailsModal({
  link,
  clients,
  baseUrl,
  onClose,
  onSaved,
}: {
  link: SharedLink;
  clients: Client[];
  baseUrl: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(link.client_ids);
  const [merge, setMerge] = useState(link.merge);
  const [range, setRange] = useState<DateRange>({ start: link.date_start, end: link.date_end });
  const [sections, setSections] = useState<VisibleSections>(link.visible_sections);
  const [mode, setMode] = useState<"live" | "frozen">(link.mode);
  const [label, setLabel] = useState(link.label ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleClient(id: string) {
    setSelectedClientIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
    setSaved(false);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          clientIds: selectedClientIds,
          merge,
          dateStart: range.start,
          dateEnd: range.end,
          visibleSections: sections,
          mode,
          label: label || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível salvar as alterações.");
        return;
      }
      setSaved(true);
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  const url = `${baseUrl}/c/${link.token}`;

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        style={{ background: "rgba(33,0,0,0.55)" }}
        onClick={onClose}
      >
        <div
          className="atlas-card max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="font-display text-2xl mb-1">
            Detalhes do <span className="atlas-gold">Link</span>
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
            Criado em {new Date(link.created_at).toLocaleDateString("pt-BR")} · atualmente aponta para{" "}
            {formatRangeLabel({ start: link.date_start, end: link.date_end })}
          </p>

          <div className="flex gap-2 mb-5">
            <input readOnly className="atlas-input flex-1 text-sm" value={url} onClick={(e) => (e.target as HTMLInputElement).select()} />
            <button
              type="button"
              className="atlas-btn-ghost text-sm"
              onClick={() => navigator.clipboard.writeText(url)}
            >
              Copiar
            </button>
          </div>

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
              {selectedClientIds.length >= 2 && (
                <label className="flex items-center gap-2 text-sm mt-3">
                  <input
                    type="checkbox"
                    checked={merge}
                    onChange={(e) => {
                      setMerge(e.target.checked);
                      setSaved(false);
                    }}
                  />
                  Unir empresas em um único relatório (soma as métricas de todas)
                </label>
              )}
            </div>

            <div>
              <div className="text-xs font-bold uppercase mb-2" style={{ color: "var(--ink-soft)" }}>
                Período visível
              </div>
              <DateRangePicker
                value={range}
                onChange={(r) => {
                  setRange(r);
                  setSaved(false);
                }}
              />
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
                      onChange={(e) => {
                        setSections((prev) => ({ ...prev, [key]: e.target.checked }));
                        setSaved(false);
                      }}
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
                  <input
                    type="radio"
                    checked={mode === "live"}
                    onChange={() => {
                      setMode("live");
                      setSaved(false);
                    }}
                  />
                  Ao vivo (atualiza com novos dados importados no mesmo período)
                </label>
              </div>
              <div className="flex gap-3 text-sm mt-1">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mode === "frozen"}
                    onChange={() => {
                      setMode("frozen");
                      setSaved(false);
                    }}
                  />
                  Fixo (congela os dados de agora)
                </label>
              </div>
            </div>

            <input
              placeholder="Rótulo interno (opcional, ex: Relatório semanal Binnos)"
              className="atlas-input"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setSaved(false);
              }}
            />

            {error && (
              <p className="text-sm font-semibold" style={{ color: "var(--red-600)" }}>
                {error}
              </p>
            )}
            {saved && !error && (
              <p className="text-sm font-semibold" style={{ color: "#2fa64c" }}>
                Alterações salvas.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button type="button" className="atlas-btn-ghost" onClick={onClose}>
                Fechar
              </button>
              <button
                type="button"
                className="atlas-btn-primary"
                disabled={loading || selectedClientIds.length === 0}
                onClick={handleSave}
              >
                {loading ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
