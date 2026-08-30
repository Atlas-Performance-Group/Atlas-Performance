// Pontuação de desempenho (-100 a 100) usada nos gráficos de "dias bons x
// dias ruins" e "campanhas boas x ruins": combina CTR, frequência, taxa de
// conversa e custo por conversa em um único número.
//
// Diferente dos semáforos (que só têm 3 níveis: bom/médio/ruim), aqui cada
// métrica recebe uma nota contínua entre -1 e 1, de acordo com a distância
// real até os limiares "ruim"/"bom" — assim duas campanhas "boas" com
// desempenhos bem diferentes não ficam empatadas no topo da escala.

import { computeDerivedMetrics, type MetricsTotals } from "./metrics";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Mapeia `value` para uma nota entre -1 e 1: -0.5 no limiar "ruim", +0.5 no
// limiar "bom", com extrapolação linear além disso (saturando em -1/+1).
function continuousScore(value: number, badBoundary: number, goodBoundary: number): number {
  const slope = 1 / (goodBoundary - badBoundary);
  const score = -0.5 + (value - badBoundary) * slope;
  return clamp(score, -1, 1);
}

// Igual, mas para métricas onde "menor é melhor" (frequência, custo).
function continuousScoreInverted(value: number, badBoundary: number, goodBoundary: number): number {
  const slope = 1 / (badBoundary - goodBoundary);
  const score = -0.5 + (badBoundary - value) * slope;
  return clamp(score, -1, 1);
}

export function computePerformanceScore(
  totals: MetricsTotals,
  targetCostPerConversation: number | null | undefined
): number | null {
  const derived = computeDerivedMetrics(totals);
  const scores: number[] = [];

  if (derived.ctr !== null) {
    scores.push(continuousScore(derived.ctr, 0.8, 1.5));
  }
  if (derived.frequency !== null) {
    scores.push(continuousScoreInverted(derived.frequency, 4, 2.5));
  }
  if (derived.conversationRate !== null) {
    scores.push(continuousScore(derived.conversationRate, 5, 10));
  }
  if (derived.costPerConversation !== null && targetCostPerConversation && targetCostPerConversation > 0) {
    scores.push(
      continuousScoreInverted(derived.costPerConversation, targetCostPerConversation * 1.3, targetCostPerConversation)
    );
  }

  if (scores.length === 0) return null;

  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return Math.round(avg * 100);
}
