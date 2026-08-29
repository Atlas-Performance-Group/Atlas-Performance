import { formatCurrencyBRL, formatNumber } from "@/lib/metrics";
import type { ClientReport } from "@/lib/types";

export function KpiCards({ report }: { report: ClientReport }) {
  const { totals, derived } = report;
  const items = [
    {
      label: "Investimento",
      value: formatCurrencyBRL(totals.spend),
      desc: "Total investido em anúncios nesse período.",
    },
    {
      label: "Cliques",
      value: formatNumber(totals.linkClicks),
      desc: "Quantas pessoas clicaram no anúncio.",
    },
    {
      label: "Conversas Iniciadas",
      value: formatNumber(totals.conversations),
      desc: "Pessoas que iniciaram uma conversa pelo anúncio.",
    },
    {
      label: "Custo por Conversa",
      value: formatCurrencyBRL(derived.costPerConversation),
      desc: "Quanto custou, em média, cada conversa iniciada. Quanto menor, melhor.",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="atlas-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
            {item.label}
          </div>
          <div className="font-display text-3xl mt-1" style={{ color: "var(--red-brand)" }}>
            {item.value}
          </div>
          <div className="text-xs mt-2" style={{ color: "var(--ink-faint)" }}>
            {item.desc}
          </div>
        </div>
      ))}
    </div>
  );
}
