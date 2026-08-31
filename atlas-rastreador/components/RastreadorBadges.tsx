import type { RiskLevel } from "@/lib/risk";
import { RISK_LABELS } from "@/lib/risk";
import type { LocationAccuracy, NetworkType } from "@/lib/geo/types";
import { NETWORK_TYPE_LABELS } from "@/lib/geo/classify";

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: "#2fa64c",
  MEDIUM: "var(--gold-500)",
  HIGH: "var(--red-600)",
  CRITICAL: "var(--red-800)",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
      style={{ background: `${RISK_COLORS[level]}22`, color: RISK_COLORS[level] }}
    >
      <span className={`semaphore-dot ${level === "LOW" ? "semaphore-good" : level === "MEDIUM" ? "semaphore-medium" : "semaphore-bad"}`} />
      {RISK_LABELS[level]}
    </span>
  );
}

const ACCURACY_LABELS: Record<LocationAccuracy, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
  UNKNOWN: "Desconhecida",
};

export function AccuracyBadge({ accuracy }: { accuracy: LocationAccuracy }) {
  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: "rgba(224,134,0,0.14)", color: "var(--gold-700)" }}
    >
      Precisão: {ACCURACY_LABELS[accuracy]}
    </span>
  );
}

export function NetworkTypeBadge({ type }: { type: NetworkType }) {
  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: "rgba(36,20,18,0.08)", color: "var(--ink-soft)" }}
    >
      {NETWORK_TYPE_LABELS[type]}
    </span>
  );
}

export function PrecisionDisclaimer() {
  return (
    <p
      className="text-xs rounded-xl px-3 py-2"
      style={{ background: "rgba(224,134,0,0.1)", color: "var(--ink-soft)", border: "1px solid var(--line-soft)" }}
    >
      Localização aproximada baseada em dados públicos de geolocalização de IP. Não representa
      necessariamente o endereço físico exato do usuário.
    </p>
  );
}
