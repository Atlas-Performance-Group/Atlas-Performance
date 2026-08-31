// Tipos/labels de risco sem nenhuma dependência de servidor (Mongo etc.) —
// pode ser importado com segurança por componentes client.

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};
