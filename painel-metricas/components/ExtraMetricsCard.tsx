import type { ExtraMetricAgg } from "@/lib/extraMetrics";
import { formatExtraValue } from "@/lib/extraMetrics";

export function ExtraMetricsCard({ metrics }: { metrics: ExtraMetricAgg[] }) {
  if (metrics.length === 0) return null;

  return (
    <div className="atlas-card p-6">
      <h3 className="font-display text-xl mb-1">
        Outras <span className="atlas-gold">Métricas do CSV</span>
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
        Todas as demais colunas encontradas no arquivo importado, somadas (ou em média, quando fizer mais
        sentido) no período selecionado.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="p-3 rounded-xl" style={{ border: "1px solid var(--line-soft)" }}>
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
              {metric.label}
              {metric.kind === "avg" && <span style={{ color: "var(--ink-faint)" }}> (média)</span>}
            </div>
            <div className="font-display text-lg mt-1">{formatExtraValue(metric.label, metric.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
