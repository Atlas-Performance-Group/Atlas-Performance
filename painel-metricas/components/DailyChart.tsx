"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyRow } from "@/lib/data";

function formatDateLabel(d: string) {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

export function DailyChart({ rows }: { rows: DailyRow[] }) {
  const isDaily = rows.every((r) => r.date_start === r.date_end);

  if (!isDaily || rows.length === 0) {
    return (
      <div className="atlas-card p-6">
        <h3 className="font-display text-xl mb-2">
          Evolução <span className="atlas-gold">Diária</span>
        </h3>
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          {rows.length === 0
            ? "Sem dados importados para esse período."
            : "Este período contém dados consolidados (sem quebra por dia), por isso não é possível exibir a evolução diária aqui. Importe um CSV com detalhamento diário para ver o gráfico."}
        </p>
      </div>
    );
  }

  // Soma por dia antes de plotar: um mesmo dia pode ter mais de um registro
  // (ex: um por conjunto de anúncios), e o gráfico mostra a evolução total
  // do cliente, não por conjunto/campanha.
  const byDate = new Map<string, { Cliques: number; Conversas: number; Investimento: number }>();
  for (const r of rows) {
    const entry = byDate.get(r.date_start) ?? { Cliques: 0, Conversas: 0, Investimento: 0 };
    entry.Cliques += Number(r.link_clicks);
    entry.Conversas += Number(r.conversations);
    entry.Investimento += Number(r.spend);
    byDate.set(r.date_start, entry);
  }
  const data = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => ({ date: formatDateLabel(date), ...totals }));

  return (
    <div className="atlas-card p-6">
      <h3 className="font-display text-xl mb-4">
        Evolução <span className="atlas-gold">Diária</span>
      </h3>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c00000" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#c00000" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="convGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e08600" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#e08600" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1e8d8" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b5850" }} axisLine={{ stroke: "#f1e8d8" }} />
            <YAxis tick={{ fontSize: 12, fill: "#6b5850" }} axisLine={{ stroke: "#f1e8d8" }} />
            <Tooltip
              contentStyle={{
                background: "#fffdf7",
                border: "1px solid #f1e8d8",
                borderRadius: 10,
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="Cliques"
              stroke="#c00000"
              fill="url(#clicksGradient)"
              strokeWidth={2}
              animationDuration={700}
              animationEasing="ease-out"
            />
            <Area
              type="monotone"
              dataKey="Conversas"
              stroke="#e08600"
              fill="url(#convGradient)"
              strokeWidth={2}
              animationDuration={700}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
