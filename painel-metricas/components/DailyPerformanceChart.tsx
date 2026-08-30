"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyRow } from "@/lib/data";
import { computePerformanceScore } from "@/lib/performanceScore";
import type { MetricsTotals } from "@/lib/metrics";

function formatDateLabel(d: string) {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

function emptyTotals(): MetricsTotals {
  return { spend: 0, impressions: 0, reach: 0, linkClicks: 0, conversations: 0, days: 1 };
}

export function DailyPerformanceChart({
  rows,
  targetCostPerConversation,
}: {
  rows: DailyRow[];
  targetCostPerConversation: number | null;
}) {
  const isDaily = rows.length > 0 && rows.every((r) => r.date_start === r.date_end);

  if (!isDaily) {
    return null;
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

  const data = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => ({
      date: formatDateLabel(date),
      score: computePerformanceScore(totals, targetCostPerConversation) ?? 0,
    }));

  if (data.length === 0) return null;

  return (
    <div className="atlas-card p-6">
      <h3 className="font-display text-xl mb-1">
        Desempenho <span className="atlas-gold">Dia a Dia</span>
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
        Combina CTR, frequência, taxa de conversa e custo por conversa em uma escala de -100 (dia ruim) a
        100 (dia bom).
      </p>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1e8d8" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b5850" }} axisLine={{ stroke: "#f1e8d8" }} />
            <YAxis domain={[-100, 100]} tick={{ fontSize: 12, fill: "#6b5850" }} axisLine={{ stroke: "#f1e8d8" }} />
            <ReferenceLine y={0} stroke="#c9bfa8" />
            <Tooltip
              formatter={(value) => [value, "Pontuação"]}
              contentStyle={{
                background: "#fffdf7",
                border: "1px solid #f1e8d8",
                borderRadius: 10,
                fontSize: 13,
              }}
            />
            <Bar dataKey="score" radius={[4, 4, 4, 4]} animationDuration={700} animationEasing="ease-out">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.score >= 0 ? "#2fa64c" : "#c00000"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
