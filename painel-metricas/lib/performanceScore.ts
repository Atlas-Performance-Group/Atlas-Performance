// Pontuação de desempenho (-100 a 100) usada nos gráficos de "dias bons x
// dias ruins" e "campanhas boas x ruins": combina os mesmos semáforos já
// usados nos indicadores detalhados (CTR, frequência, taxa de conversa,
// custo por conversa) em um único número fácil de plotar.

import {
  computeDerivedMetrics,
  conversationRateStatus,
  costPerConversationStatus,
  ctrStatus,
  frequencyStatus,
  type MetricsTotals,
  type SemaphoreLevel,
} from "./metrics";

function statusScore(level: SemaphoreLevel): number | null {
  if (level === "good") return 1;
  if (level === "medium") return 0;
  if (level === "bad") return -1;
  return null;
}

export function computePerformanceScore(
  totals: MetricsTotals,
  targetCostPerConversation: number | null | undefined
): number | null {
  const derived = computeDerivedMetrics(totals);
  const scores = [
    statusScore(ctrStatus(derived.ctr)),
    statusScore(frequencyStatus(derived.frequency)),
    statusScore(conversationRateStatus(derived.conversationRate)),
    statusScore(costPerConversationStatus(derived.costPerConversation, targetCostPerConversation)),
  ].filter((s): s is number => s !== null);

  if (scores.length === 0) return null;

  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return Math.round(avg * 100);
}
