import { getMetricsInRange, sumRows, type Client } from "./data";
import { computeDerivedMetrics } from "./metrics";
import { generateInsights } from "./insights";
import { aggregateExtraMetrics } from "./extraMetrics";

// Snapshot usado pelos links "fixos" (frozen): congela os números do
// momento da criação/edição do link, em vez de recalcular a cada acesso.
export async function buildFrozenSnapshot(clients: Client[], dateStart: string, dateEnd: string) {
  const data = await Promise.all(
    clients.map(async (client) => {
      const rows = await getMetricsInRange(client.id, dateStart, dateEnd);
      const totals = sumRows(rows, dateStart, dateEnd);
      const derived = computeDerivedMetrics(totals);
      const insights = generateInsights(totals);
      const extraMetrics = aggregateExtraMetrics(rows);
      return { clientId: client.id, totals, derived, insights, daily: rows, extraMetrics };
    })
  );
  return { generatedAt: new Date().toISOString(), data };
}
