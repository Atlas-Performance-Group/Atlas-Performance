import type { Insight } from "@/lib/insights";

export function InsightsList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="atlas-card p-6">
        <h3 className="font-display text-xl mb-2">
          Análise &amp; <span className="atlas-gold">Recomendações</span>
        </h3>
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          Sem dados suficientes no período selecionado para gerar uma análise.
        </p>
      </div>
    );
  }

  return (
    <div className="atlas-card p-6">
      <h3 className="font-display text-xl mb-4">
        Análise &amp; <span className="atlas-gold">Recomendações</span>
      </h3>
      <ul className="flex flex-col gap-3">
        {insights.map((insight, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed">
            <span className="text-lg leading-none">{insight.emoji}</span>
            <span style={{ color: "var(--ink)" }}>{insight.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
