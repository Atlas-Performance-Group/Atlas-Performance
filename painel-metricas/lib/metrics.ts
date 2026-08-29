// Fórmulas e indicadores — portados da lógica validada dos relatórios
// estáticos da Atlas (CPC, CTR, CPM, custo por conversa, etc.).

export type MetricsTotals = {
  spend: number;
  impressions: number;
  reach: number;
  linkClicks: number;
  conversations: number;
  days: number;
};

export type DerivedMetrics = {
  cpc: number | null;
  ctr: number | null;
  cpm: number | null;
  frequency: number | null;
  conversationRate: number | null;
  costPerConversation: number | null;
  costPerReach: number | null;
  avgSpendPerDay: number | null;
  conversationsPerDay: number | null;
};

function safeDiv(a: number, b: number): number | null {
  if (!b) return null;
  return a / b;
}

export function computeDerivedMetrics(t: MetricsTotals): DerivedMetrics {
  return {
    cpc: safeDiv(t.spend, t.linkClicks),
    ctr: (() => {
      const r = safeDiv(t.linkClicks, t.impressions);
      return r === null ? null : r * 100;
    })(),
    cpm: (() => {
      const r = safeDiv(t.spend, t.impressions);
      return r === null ? null : r * 1000;
    })(),
    frequency: safeDiv(t.impressions, t.reach),
    conversationRate: (() => {
      const r = safeDiv(t.conversations, t.linkClicks);
      return r === null ? null : r * 100;
    })(),
    costPerConversation: safeDiv(t.spend, t.conversations),
    costPerReach: safeDiv(t.spend, t.reach),
    avgSpendPerDay: t.days > 0 ? t.spend / t.days : null,
    conversationsPerDay: t.days > 0 ? t.conversations / t.days : null,
  };
}

export type SemaphoreLevel = "good" | "medium" | "bad" | "neutral";

export function ctrStatus(ctr: number | null): SemaphoreLevel {
  if (ctr === null) return "neutral";
  if (ctr >= 1.5) return "good";
  if (ctr >= 0.8) return "medium";
  return "bad";
}

export function frequencyStatus(freq: number | null): SemaphoreLevel {
  if (freq === null) return "neutral";
  if (freq <= 2.5) return "good";
  if (freq <= 4) return "medium";
  return "bad";
}

export function conversationRateStatus(rate: number | null): SemaphoreLevel {
  if (rate === null) return "neutral";
  if (rate >= 10) return "good";
  if (rate >= 5) return "medium";
  return "bad";
}

export function costPerConversationStatus(
  cost: number | null,
  target: number | null | undefined
): SemaphoreLevel {
  if (cost === null) return "neutral";
  if (!target || target <= 0) return "neutral";
  if (cost <= target) return "good";
  if (cost <= target * 1.3) return "medium";
  return "bad";
}

export function formatCurrencyBRL(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return Math.round(value).toLocaleString("pt-BR");
}

export function formatDecimal(value: number | null, digits = 2): string {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatPercent(value: number | null, digits = 2): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function formatMultiplier(value: number | null, digits = 2): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}x`;
}
