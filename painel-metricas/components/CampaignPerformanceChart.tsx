"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyRow } from "@/lib/data";
import { computePerformanceScore } from "@/lib/performanceScore";
import type { MetricsTotals } from "@/lib/metrics";

function emptyTotals(): MetricsTotals {
  return { spend: 0, impressions: 0, reach: 0, linkClicks: 0, conversations: 0, days: 1 };
}

export function CampaignPerformanceChart({
  rows,
  targetCostPerConversation,
}: {
  rows: DailyRow[];
  targetCostPerConversation: number | null;
}) {
  const bySource = new Map<string, MetricsTotals>();
  for (const r of rows) {
    if (!r.source_label) continue;
    const entry = bySource.get(r.source_label) ?? emptyTotals();
    entry.spend += Number(r.spend);
    entry.impressions += Number(r.impressions);
    entry.reach += Number(r.reach);
    entry.linkClicks += Number(r.link_clicks);
    entry.conversations += Number(r.conversations);
    bySource.set(r.source_label, entry);
  }

  if (bySource.size === 0) return null;

  const data = [...bySource.entries()]
    .map(([label, totals]) => ({
      label,
      score: computePerformanceScore(totals, targetCostPerConversation) ?? 0,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="atlas-card p-6">
      <h3 className="font-display text-xl mb-1">
        Desempenho por <span className="atlas-gold">Conjunto / Campanha</span>
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
        Mesma pontuação de -100 a 100, comparando cada conjunto de anúncios ou campanha no período
        selecionado.
      </p>
      <div style={{ width: "100%", height: Math.max(160, data.length * 44) }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1e8d8" horizontal={false} />
            <XAxis type="number" domain={[-100, 100]} tick={{ fontSize: 12, fill: "#6b5850" }} axisLine={{ stroke: "#f1e8d8" }} />
            <YAxis
              type="category"
              dataKey="label"
              width={160}
              tick={{ fontSize: 12, fill: "#6b5850" }}
              axisLine={{ stroke: "#f1e8d8" }}
            />
            <ReferenceLine x={0} stroke="#c9bfa8" />
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
