import {
  ctrStatus,
  cpcStatus,
  frequencyStatus,
  conversationRateStatus,
  costPerConversationStatus,
  formatCurrencyBRL,
  formatDecimal,
  formatMultiplier,
  formatNumber,
  formatPercent,
  type SemaphoreLevel,
} from "@/lib/metrics";
import type { ClientReport } from "@/lib/types";
import { SemaphoreDot } from "./SemaphoreDot";

export function IndicatorGrid({ report }: { report: ClientReport }) {
  const { totals, derived, client } = report;

  const items: { label: string; value: string; level?: SemaphoreLevel }[] = [
    { label: "CPC", value: formatCurrencyBRL(derived.cpc), level: cpcStatus(derived.cpc) },
    { label: "CTR", value: formatPercent(derived.ctr), level: ctrStatus(derived.ctr) },
    { label: "CPM", value: formatCurrencyBRL(derived.cpm) },
    { label: "Impressões", value: formatNumber(totals.impressions) },
    { label: "Alcance", value: formatNumber(totals.reach) },
    { label: "Frequência", value: formatMultiplier(derived.frequency), level: frequencyStatus(derived.frequency) },
    {
      label: "Taxa de Conversa",
      value: formatPercent(derived.conversationRate),
      level: conversationRateStatus(derived.conversationRate),
    },
    { label: "Custo por Alcance", value: formatCurrencyBRL(derived.costPerReach) },
    { label: "Investimento Médio / Dia", value: formatCurrencyBRL(derived.avgSpendPerDay) },
    { label: "Conversas / Dia", value: formatDecimal(derived.conversationsPerDay) },
    {
      label: "Custo por Conversa",
      value: formatCurrencyBRL(derived.costPerConversation),
      level: costPerConversationStatus(derived.costPerConversation, client.target_cost_per_conversation),
    },
  ];

  return (
    <div className="atlas-card p-6">
      <h3 className="font-display text-xl mb-4">
        Indicadores <span className="atlas-gold">Detalhados</span>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.label} className="p-3 rounded-xl" style={{ border: "1px solid var(--line-soft)" }}>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
              {item.level && <SemaphoreDot level={item.level} />}
              {item.label}
            </div>
            <div className="font-display text-lg mt-1">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
