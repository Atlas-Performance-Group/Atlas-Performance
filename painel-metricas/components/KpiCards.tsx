import { formatCurrencyBRL, formatNumber, percentDelta, spendWithTax } from "@/lib/metrics";
import type { ClientReport } from "@/lib/types";

// Verde/vermelho de acordo com o que é bom para aquela métrica: mais
// cliques/conversas é bom, custo por conversa mais alto é ruim. `null`
// (investimento) fica neutro — gastar mais não é bom nem ruim por si só.
function deltaColor(delta: number, higherIsBetter: boolean | null): string {
  if (higherIsBetter === null) return "var(--ink-faint)";
  const isUp = delta >= 0;
  const isGood = higherIsBetter ? isUp : !isUp;
  return isGood ? "#2fa64c" : "var(--red-600)";
}

function DeltaBadge({ delta, higherIsBetter }: { delta: number | null; higherIsBetter: boolean | null }) {
  if (delta === null) return null;
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "•";
  return (
    <span className="text-xs font-bold ml-2" style={{ color: deltaColor(delta, higherIsBetter) }}>
      {arrow} {Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
    </span>
  );
}

export function KpiCards({ report }: { report: ClientReport }) {
  const { totals, derived, comparison } = report;
  const prevTotals = comparison?.previousTotals ?? null;
  const prevDerived = comparison?.previousDerived ?? null;

  const items: {
    label: string;
    value: string;
    desc: string;
    note?: string;
    delta: number | null;
    higherIsBetter: boolean | null;
  }[] = [
    {
      label: "Investimento",
      value: formatCurrencyBRL(totals.spend),
      desc: "Total investido em anúncios nesse período.",
      note: `+ 12,5% de imposto: ${formatCurrencyBRL(spendWithTax(totals.spend))}`,
      delta: percentDelta(totals.spend, prevTotals?.spend ?? null),
      higherIsBetter: null,
    },
    {
      label: "Cliques",
      value: formatNumber(totals.linkClicks),
      desc: "Quantas pessoas clicaram no anúncio.",
      delta: percentDelta(totals.linkClicks, prevTotals?.linkClicks ?? null),
      higherIsBetter: true,
    },
    {
      label: "Conversas Iniciadas",
      value: formatNumber(totals.conversations),
      desc: "Pessoas que iniciaram uma conversa pelo anúncio.",
      delta: percentDelta(totals.conversations, prevTotals?.conversations ?? null),
      higherIsBetter: true,
    },
    {
      label: "Custo por Conversa",
      value: formatCurrencyBRL(derived.costPerConversation),
      desc: "Quanto custou, em média, cada conversa iniciada. Quanto menor, melhor.",
      delta: percentDelta(derived.costPerConversation, prevDerived?.costPerConversation ?? null),
      higherIsBetter: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 atlas-stagger">
      {items.map((item) => (
        <div key={item.label} className="atlas-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
            {item.label}
          </div>
          <div className="font-display text-3xl mt-1 flex items-baseline flex-wrap" style={{ color: "var(--red-brand)" }}>
            {item.value}
            <DeltaBadge delta={item.delta} higherIsBetter={item.higherIsBetter} />
          </div>
          {item.note && (
            <div className="text-xs font-bold mt-1" style={{ color: "var(--ink-soft)" }}>
              {item.note}
            </div>
          )}
          <div className="text-xs mt-2" style={{ color: "var(--ink-faint)" }}>
            {item.desc}
            {comparison && (
              <span> Comparado ao período anterior de mesma duração.</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
