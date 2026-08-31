import { getMetricsInRange, sumRows, type Client } from "./data";
import { computeDerivedMetrics } from "./metrics";
import { generateInsights } from "./insights";
import { aggregateExtraMetrics } from "./extraMetrics";
import { computePreviousPeriodComparison, computePreviousPeriodComparisonForClients } from "./comparison";

// Snapshot usado pelos links "fixos" (frozen): congela os números do
// momento da criação/edição do link, em vez de recalcular a cada acesso.
export async function buildFrozenSnapshot(clients: Client[], dateStart: string, dateEnd: string, merge = false) {
  if (merge && clients.length > 1) {
    const rowsPerClient = await Promise.all(clients.map((client) => getMetricsInRange(client.id, dateStart, dateEnd)));
    const rows = rowsPerClient.flat();
    const totals = sumRows(rows, dateStart, dateEnd);
    const derived = computeDerivedMetrics(totals);
    const insights = generateInsights(totals);
    const extraMetrics = aggregateExtraMetrics(rows);
    const comparison = await computePreviousPeriodComparisonForClients(
      clients.map((c) => c.id),
      { start: dateStart, end: dateEnd }
    );
    return {
      generatedAt: new Date().toISOString(),
      data: [{ clientId: "merged", totals, derived, insights, daily: rows, extraMetrics, comparison }],
    };
  }

  const data = await Promise.all(
    clients.map(async (client) => {
      const rows = await getMetricsInRange(client.id, dateStart, dateEnd);
      const totals = sumRows(rows, dateStart, dateEnd);
      const derived = computeDerivedMetrics(totals);
      const insights = generateInsights(totals);
      const extraMetrics = aggregateExtraMetrics(rows);
      const comparison = await computePreviousPeriodComparison(client.id, { start: dateStart, end: dateEnd });
      return { clientId: client.id, totals, derived, insights, daily: rows, extraMetrics, comparison };
    })
  );
  return { generatedAt: new Date().toISOString(), data };
}
