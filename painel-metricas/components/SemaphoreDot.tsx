import type { SemaphoreLevel } from "@/lib/metrics";

export function SemaphoreDot({ level }: { level: SemaphoreLevel }) {
  return <span className={`semaphore-dot semaphore-${level}`} title={levelLabel(level)} />;
}

function levelLabel(level: SemaphoreLevel) {
  switch (level) {
    case "good":
      return "Bom";
    case "medium":
      return "Mediano";
    case "bad":
      return "Ruim";
    default:
      return "Sem referência";
  }
}
