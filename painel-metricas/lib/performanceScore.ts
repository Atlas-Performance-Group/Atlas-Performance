// Pontuação de desempenho (-100 a 100) usada nos gráficos de "dias bons x
// dias ruins" e "campanhas boas x ruins".
//
// Combina duas coisas:
// 1. Eficiência: CTR, frequência, taxa de conversa e custo por conversa,
//    numa nota contínua de -1 a 1 de acordo com a distância real até os
//    limiares "ruim"/"bom" (não só 3 níveis fixos).
// 2. Escala real: quantos cliques e conversas aquele dia/campanha trouxe,
//    comparado aos outros dias/campanhas do mesmo período — assim uma
//    campanha com poucos cliques não pontua igual a uma que trouxe volume
//    alto só porque a taxa de conversão das duas é parecida.
//
// As duas notas são combinadas com peso, o que evita que a maioria das
// barras fique empacada em +100/-100: só pontua no topo quem realmente tem
// a melhor eficiência E o maior volume dentro do próprio período.

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

// Normaliza `value` dentro do intervalo [min, max] do próprio conjunto
// (min-max scaling) para uma nota de -1 a 1.
function relativeScore(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp(((value - min) / (max - min)) * 2 - 1, -1, 1);
}

function efficiencyScore(
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
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

export type PerformanceBreakdown = {
  score: number | null;
  totals: MetricsTotals;
  ctr: number | null;
  frequency: number | null;
  conversationRate: number | null;
  costPerConversation: number | null;
};

const EFFICIENCY_WEIGHT = 0.6;
const VOLUME_WEIGHT = 0.4;

// Calcula a pontuação de cada item de um grupo (ex: todos os dias do
// período, ou todas as campanhas), pontuando o volume de cliques/conversas
// de cada um relativo aos demais do mesmo grupo — por isso precisa da lista
// inteira, não de um item isolado.
export function computePerformanceBreakdowns<T>(
  entries: T[],
  getTotals: (entry: T) => MetricsTotals,
  targetCostPerConversation: number | null | undefined
): Map<T, PerformanceBreakdown> {
  const totalsList = entries.map(getTotals);
  const clicksList = totalsList.map((t) => t.linkClicks);
  const conversationsList = totalsList.map((t) => t.conversations);
  const minClicks = Math.min(...clicksList);
  const maxClicks = Math.max(...clicksList);
  const minConversations = Math.min(...conversationsList);
  const maxConversations = Math.max(...conversationsList);

  const result = new Map<T, PerformanceBreakdown>();

  entries.forEach((entry, i) => {
    const totals = totalsList[i];
    const derived = computeDerivedMetrics(totals);
    const eff = efficiencyScore(totals, targetCostPerConversation);

    const volume =
      entries.length > 1
        ? (relativeScore(totals.linkClicks, minClicks, maxClicks) +
            relativeScore(totals.conversations, minConversations, maxConversations)) /
          2
        : 0;

    let score: number | null;
    if (eff === null) {
      score = null;
    } else {
      score = Math.round((eff * EFFICIENCY_WEIGHT + volume * VOLUME_WEIGHT) * 100);
    }

    result.set(entry, {
      score,
      totals,
      ctr: derived.ctr,
      frequency: derived.frequency,
      conversationRate: derived.conversationRate,
      costPerConversation: derived.costPerConversation,
    });
  });

  return result;
}

// Gradiente de cor de acordo com a pontuação: vermelho (muito ruim) -> laranja
// -> tons de amarelo (médio, do mais escuro ao mais claro) -> verde (muito bom).
const COLOR_STOPS: { score: number; color: [number, number, number] }[] = [
  { score: -100, color: [192, 0, 0] }, // vermelho — muito ruim
  { score: -55, color: [224, 134, 0] }, // laranja
  { score: -20, color: [232, 168, 45] }, // amarelo escuro
  { score: 0, color: [240, 196, 90] }, // amarelo
  { score: 20, color: [244, 214, 140] }, // amarelo claro
  { score: 55, color: [163, 196, 90] }, // amarelo-esverdeado
  { score: 100, color: [47, 166, 76] }, // verde — muito bom
];

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

export function scoreColor(score: number): string {
  const clamped = clamp(score, -100, 100);
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const curr = COLOR_STOPS[i];
    const next = COLOR_STOPS[i + 1];
    if (clamped >= curr.score && clamped <= next.score) {
      const t = (clamped - curr.score) / (next.score - curr.score);
      const [r, g, b] = [
        lerp(curr.color[0], next.color[0], t),
        lerp(curr.color[1], next.color[1], t),
        lerp(curr.color[2], next.color[2], t),
      ];
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return "rgb(107, 88, 80)";
}
