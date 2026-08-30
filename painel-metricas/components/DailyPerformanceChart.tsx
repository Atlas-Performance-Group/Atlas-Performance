"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyRow } from "@/lib/data";
import { computePerformanceBreakdowns, scoreColor, type PerformanceBreakdown } from "@/lib/performanceScore";
import type { MetricsTotals } from "@/lib/metrics";
import { PerformanceTooltipContent } from "./PerformanceTooltip";

function formatDateLabel(d: string) {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

function emptyTotals(): MetricsTotals {
  return { spend: 0, impressions: 0, reach: 0, linkClicks: 0, conversations: 0, days: 1 };
}

type DataPoint = { date: string; score: number; breakdown: PerformanceBreakdown };

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

  const dates = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  const breakdowns = computePerformanceBreakdowns(dates, ([, totals]) => totals, targetCostPerConversation);

  const data: DataPoint[] = dates.map((entry) => {
    const [date] = entry;
    const breakdown = breakdowns.get(entry)!;
    return { date: formatDateLabel(date), score: breakdown.score ?? 0, breakdown };
  });

  if (data.length === 0) return null;

  return (
    <div className="atlas-card p-6">
      <h3 className="font-display text-xl mb-1">
        Desempenho <span className="atlas-gold">Dia a Dia</span>
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
        Combina a eficiência (CTR, frequência, taxa de conversa, custo por conversa) com o volume real de
        cliques e conversas de cada dia, comparado aos outros dias do período. Passe o mouse em uma barra
        para ver o porquê da pontuação.
      </p>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1e8d8" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b5850" }} axisLine={{ stroke: "#f1e8d8" }} />
            <YAxis domain={[-100, 100]} tick={{ fontSize: 12, fill: "#6b5850" }} axisLine={{ stroke: "#f1e8d8" }} />
            <ReferenceLine y={0} stroke="#c9bfa8" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as DataPoint;
                return <PerformanceTooltipContent label={point.date} breakdown={point.breakdown} />;
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
