"use client";

import { useState } from "react";
import { formatCurrencyBRL, formatNumber, spendWithTax } from "@/lib/metrics";
import type { DailyRow } from "@/lib/data";

function formatDateLabel(row: DailyRow) {
  const s = row.date_start;
  const e = row.date_end;
  const fmt = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };
  return s === e ? fmt(s) : `${fmt(s)} – ${fmt(e)}`;
}

const COLLAPSED_ROW_COUNT = 7;

export function DailyTable({ rows }: { rows: DailyRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasSourceLabels = rows.some((r) => r.source_label);

  const isCollapsible = rows.length > COLLAPSED_ROW_COUNT;
  const visibleRows = expanded || !isCollapsible ? rows : rows.slice(-COLLAPSED_ROW_COUNT);

  return (
    <div className="atlas-card p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-xl">
          Métricas <span className="atlas-gold">Dia a Dia</span>
        </h3>
        {isCollapsible && (
          <button type="button" className="atlas-btn-ghost text-xs" onClick={() => setExpanded((prev) => !prev)}>
            {expanded ? "Fechar" : `Expandir (${rows.length} registros)`}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          Nenhum dado importado para esse período ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left" style={{ color: "var(--ink-soft)" }}>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Dia</th>
                {hasSourceLabels && (
                  <th className="py-2 pr-4 font-bold uppercase text-xs">Conjunto/Campanha</th>
                )}
                <th className="py-2 pr-4 font-bold uppercase text-xs">Investimento</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Investimento + Imposto (12,5%)</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Cliques</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Conversas</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Custo/Conversa</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, i) => (
                <tr
                  key={`${row.date_start}-${row.date_end}-${row.source_label ?? ""}-${i}`}
                  style={{ borderTop: "1px solid var(--line-soft)" }}
                >
                  <td className="py-2 pr-4">{formatDateLabel(row)}</td>
                  {hasSourceLabels && (
                    <td className="py-2 pr-4" style={{ color: "var(--ink-soft)" }}>
                      {row.source_label ?? "—"}
                    </td>
                  )}
                  <td className="py-2 pr-4">{formatCurrencyBRL(Number(row.spend))}</td>
                  <td className="py-2 pr-4">{formatCurrencyBRL(spendWithTax(Number(row.spend)))}</td>
                  <td className="py-2 pr-4">{formatNumber(Number(row.link_clicks))}</td>
                  <td className="py-2 pr-4">{formatNumber(Number(row.conversations))}</td>
                  <td className="py-2 pr-4">
                    {formatCurrencyBRL(Number(row.conversations) > 0 ? Number(row.spend) / Number(row.conversations) : null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
