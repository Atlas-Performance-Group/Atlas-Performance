"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyRow } from "@/lib/data";
import { computePerformanceBreakdowns, scoreColor, type PerformanceBreakdown } from "@/lib/performanceScore";
import type { MetricsTotals } from "@/lib/metrics";
import { PerformanceTooltipContent } from "./PerformanceTooltip";

function emptyTotals(): MetricsTotals {
  return { spend: 0, impressions: 0, reach: 0, linkClicks: 0, conversations: 0, days: 1 };
}

type DataPoint = { label: string; score: number; breakdown: PerformanceBreakdown };

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

  const sources = [...bySource.entries()];
  const breakdowns = computePerformanceBreakdowns(sources, ([, totals]) => totals, targetCostPerConversation);

  const data: DataPoint[] = sources
    .map((entry) => {
      const [label] = entry;
      const breakdown = breakdowns.get(entry)!;
      return { label, score: breakdown.score ?? 0, breakdown };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="atlas-card p-6">
      <h3 className="font-display text-xl mb-1">
        Desempenho por <span className="atlas-gold">Conjunto / Campanha</span>
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
        Combina a eficiência (CTR, frequência, taxa de conversa, custo por conversa) com o volume real de
        cliques e conversas de cada conjunto/campanha, comparado aos demais do período selecionado. Passe
        o mouse em uma barra para ver o porquê da pontuação.
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
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as DataPoint;
                return <PerformanceTooltipContent label={point.label} breakdown={point.breakdown} />;
              }}
            />
            <Bar dataKey="score" radius={[4, 4, 4, 4]} animationDuration={700} animationEasing="ease-out">
              {data.map((entry, i) => (
                <Cell key={i} fill={scoreColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
