// Agrega as métricas "extra" (todas as colunas numéricas do CSV que não
// são uma das colunas conhecidas — investimento, impressões, alcance,
// cliques no link, conversas) ao longo do intervalo de datas selecionado.

export type ExtraMetricAgg = {
  label: string;
  value: number;
  kind: "sum" | "avg";
};

function normalizeLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Colunas de configuração de conta (orçamento configurado, tipo de
// orçamento...) que às vezes já foram importadas antes desse filtro
// existir no parser do CSV — filtradas aqui também para não aparecerem
// em relatórios de dados já salvos no banco.
const EXCLUDED_EXTRA_LABELS = new Set([
  "orcamento do conjunto de anuncios",
  "tipo de orcamento do conjunto de anuncios",
  "orcamento da campanha",
  "tipo de orcamento da campanha",
]);

const AVG_KEYWORDS = [
  "cpc",
  "cpm",
  "cpa",
  "cpl",
  "ctr",
  "custo por",
  "custo medio",
  "custo médio",
  "cost per",
  "frequ",
  "taxa de",
  "rate",
  "media",
  "média",
  "roas",
  "ticket",
];

// Colunas que são razões/médias (CPC, CTR, CPM, frequência...) não fazem
// sentido somadas ao longo de vários dias — usamos a média simples nesse
// caso. As demais (contagens, cliques, visualizações...) são somadas.
export function inferAggregationKind(header: string): "sum" | "avg" {
  const h = normalizeLabel(header);
  return AVG_KEYWORDS.some((keyword) => h.includes(keyword)) ? "avg" : "sum";
}

export function aggregateExtraMetrics(rows: { extra?: Record<string, number> }[]): ExtraMetricAgg[] {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!row.extra) continue;
    for (const [key, value] of Object.entries(row.extra)) {
      if (typeof value !== "number" || Number.isNaN(value)) continue;
      if (EXCLUDED_EXTRA_LABELS.has(normalizeLabel(key))) continue;
      sums.set(key, (sums.get(key) ?? 0) + value);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const result: ExtraMetricAgg[] = [];
  for (const [key, total] of sums) {
    const kind = inferAggregationKind(key);
    const value = kind === "avg" ? total / (counts.get(key) ?? 1) : total;
    result.push({ label: key, value, kind });
  }
  return result.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function formatExtraValue(label: string, value: number): string {
  const l = label.toLowerCase();
  const isCurrency = /(r\$|brl|custo|valor|^cp[cma]\b|cpc|cpm|cpa|cpl)/i.test(l);
  const isPercent = /(%|ctr|taxa)/i.test(l);

  if (isCurrency) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (isPercent) {
    return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
