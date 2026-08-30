"use client";

import { useState } from "react";
import { computeDerivedMetrics, formatCurrencyBRL, formatNumber, formatPercent } from "@/lib/metrics";
import { computePerformanceBreakdowns, scoreColor } from "@/lib/performanceScore";
import type { DailyRow } from "@/lib/data";
import type { MetricsTotals } from "@/lib/metrics";
import { DailyPerformanceChart } from "./DailyPerformanceChart";

function formatDateLabel(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function emptyTotals(): MetricsTotals {
  return { spend: 0, impressions: 0, reach: 0, linkClicks: 0, conversations: 0, days: 1 };
}

const COLLAPSED_ROW_COUNT = 7;

export function DailyEvolutionSection({
  rows,
  targetCostPerConversation,
}: {
  rows: DailyRow[];
  targetCostPerConversation: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDaily = rows.length > 0 && rows.every((r) => r.date_start === r.date_end);

  if (!isDaily) {
    return (
      <div className="atlas-card p-6">
        <h3 className="font-display text-xl mb-2">
          Evolução <span className="atlas-gold">Diária</span>
        </h3>
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          {rows.length === 0
            ? "Sem dados importados para esse período."
            : "Este período contém dados consolidados (sem quebra por dia), por isso não é possível exibir o detalhamento diário aqui. Importe um CSV do Meta Ads com detalhamento \"Por dia\" para ver a evolução dia a dia."}
        </p>
      </div>
    );
  }

  const byDate = new Map<string, MetricsTotals>();
  for (const r of rows) {
    const entry = byDate.get(r.date_start) ?? emptyTotals();
    entry.spend += Number(r.spend);
    entry.impressions += Number(r.impressions);
    entry.reach += Number(r.reach);
    entry.linkClicks += Number(r.link_clicks);
    entry.conversations += Number(r.conversations);
    byDate.set(r.date_start, entry);
  }

  const dates = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (dates.length === 0) return null;

  const breakdowns = computePerformanceBreakdowns(dates, ([, totals]) => totals, targetCostPerConversation);

  const daysWithSpend = dates.filter(([, totals]) => totals.spend > 0 || totals.linkClicks > 0);
  const scored = daysWithSpend
    .map((entry) => ({ date: entry[0], breakdown: breakdowns.get(entry)! }))
    .filter((d) => d.breakdown.score !== null);

  const best = scored.length > 0 ? scored.reduce((a, b) => (b.breakdown.score! > a.breakdown.score! ? b : a)) : null;
  const worst = scored.length > 0 ? scored.reduce((a, b) => (b.breakdown.score! < a.breakdown.score! ? b : a)) : null;
  const emptyDays = dates.filter(([, totals]) => totals.spend === 0 && totals.linkClicks === 0).length;

  const isCollapsible = dates.length > COLLAPSED_ROW_COUNT;
  const visibleDates = expanded || !isCollapsible ? dates : dates.slice(-COLLAPSED_ROW_COUNT);

  return (
    <div className="flex flex-col gap-4">
      <div className="atlas-card p-6">
        <h3 className="font-display text-xl mb-1">
          Evolução <span className="atlas-gold">Diária</span>
        </h3>
        <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
          Detalhamento de cada dia do período selecionado: investimento, cliques, conversas e a mesma
          pontuação de desempenho usada no gráfico abaixo.
        </p>

        {(best || worst || emptyDays > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {best && (
              <div className="p-3 rounded-xl" style={{ border: `1px solid ${scoreColor(best.breakdown.score!)}` }}>
                <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
                  Melhor dia
                </div>
                <div className="font-display text-lg mt-1">{formatDateLabel(best.date)}</div>
                <div className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>
                  {formatNumber(best.breakdown.totals.conversations)} conversa(s) ·{" "}
                  {formatCurrencyBRL(best.breakdown.totals.spend)} · pontuação {best.breakdown.score}
                </div>
              </div>
            )}
            {worst && worst.date !== best?.date && (
              <div className="p-3 rounded-xl" style={{ border: `1px solid ${scoreColor(worst.breakdown.score!)}` }}>
                <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
                  Dia mais fraco
                </div>
                <div className="font-display text-lg mt-1">{formatDateLabel(worst.date)}</div>
                <div className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>
                  {formatNumber(worst.breakdown.totals.conversations)} conversa(s) ·{" "}
                  {formatCurrencyBRL(worst.breakdown.totals.spend)} · pontuação {worst.breakdown.score}
                </div>
              </div>
            )}
            {emptyDays > 0 && (
              <div className="p-3 rounded-xl" style={{ border: "1px solid var(--line-soft)" }}>
                <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
                  Dias sem veiculação
                </div>
                <div className="font-display text-lg mt-1">{emptyDays}</div>
                <div className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>
                  dia(s) do período sem investimento nem cliques registrados
                </div>
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left" style={{ color: "var(--ink-soft)" }}>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Dia</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Investimento</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Cliques</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Conversas</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">CTR</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">CPC</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Custo/Conversa</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Pontuação</th>
              </tr>
            </thead>
            <tbody>
              {visibleDates.map((entry) => {
                const [date, totals] = entry;
                const derived = computeDerivedMetrics(totals);
                const breakdown = breakdowns.get(entry)!;
                return (
                  <tr key={date} style={{ borderTop: "1px solid var(--line-soft)" }}>
                    <td className="py-2 pr-4">{formatDateLabel(date)}</td>
                    <td className="py-2 pr-4">{formatCurrencyBRL(totals.spend)}</td>
                    <td className="py-2 pr-4">{formatNumber(totals.linkClicks)}</td>
                    <td className="py-2 pr-4">{formatNumber(totals.conversations)}</td>
                    <td className="py-2 pr-4">{formatPercent(derived.ctr)}</td>
                    <td className="py-2 pr-4">{formatCurrencyBRL(derived.cpc)}</td>
                    <td className="py-2 pr-4">{formatCurrencyBRL(derived.costPerConversation)}</td>
                    <td className="py-2 pr-4">
                      {breakdown.score === null ? (
                        "—"
                      ) : (
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{ background: `${scoreColor(breakdown.score)}22`, color: scoreColor(breakdown.score) }}
                        >
                          {breakdown.score}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isCollapsible && (
          <button
            type="button"
            className="atlas-btn-ghost text-xs mt-4"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Mostrar menos" : `Mostrar todos os ${dates.length} dias`}
          </button>
        )}
      </div>

      <DailyPerformanceChart rows={rows} targetCostPerConversation={targetCostPerConversation} />
    </div>
  );
}
