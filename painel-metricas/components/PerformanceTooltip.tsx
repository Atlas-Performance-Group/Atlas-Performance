import type { PerformanceBreakdown } from "@/lib/performanceScore";
import { formatCurrencyBRL, formatMultiplier, formatNumber, formatPercent } from "@/lib/metrics";

export function PerformanceTooltipContent({ label, breakdown }: { label: string; breakdown: PerformanceBreakdown }) {
  const { score, totals, ctr, frequency, conversationRate, costPerConversation } = breakdown;
  return (
    <div
      style={{
        background: "#fffdf7",
        border: "1px solid #f1e8d8",
        borderRadius: 10,
        fontSize: 13,
        padding: "10px 14px",
        minWidth: 200,
      }}
    >
      <div className="font-bold mb-1" style={{ color: "var(--ink)" }}>
        {label}
      </div>
      <div className="text-xs mb-2" style={{ color: "var(--ink-soft)" }}>
        Pontuação: <strong>{score ?? "—"}</strong>
      </div>
      <ul className="flex flex-col gap-0.5 text-xs" style={{ color: "var(--ink-soft)" }}>
        <li>Cliques no link: {formatNumber(totals.linkClicks)}</li>
        <li>Conversas iniciadas: {formatNumber(totals.conversations)}</li>
        <li>Investimento: {formatCurrencyBRL(totals.spend)}</li>
        <li>CTR: {formatPercent(ctr)}</li>
        <li>Frequência: {formatMultiplier(frequency)}</li>
        <li>Taxa de conversa: {formatPercent(conversationRate)}</li>
        {costPerConversation !== null && <li>Custo por conversa: {formatCurrencyBRL(costPerConversation)}</li>}
      </ul>
    </div>
  );
}
