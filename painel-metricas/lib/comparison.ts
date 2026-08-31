// Compara o período selecionado com o período imediatamente anterior de
// mesma duração (ex: últimos 7 dias vs. os 7 dias antes desses).

import { getMetricsInRange, sumRows } from "./data";
import { computeDerivedMetrics, type DerivedMetrics, type MetricsTotals } from "./metrics";
import { previousPeriod, type DateRange } from "./dateRanges";

export type PeriodComparison = {
  previousRange: DateRange;
  previousTotals: MetricsTotals;
  previousDerived: DerivedMetrics;
};

export async function computePreviousPeriodComparison(
  clientId: string,
  range: DateRange
): Promise<PeriodComparison> {
  const previousRange = previousPeriod(range);
  const rows = await getMetricsInRange(clientId, previousRange.start, previousRange.end);
  const previousTotals = sumRows(rows, previousRange.start, previousRange.end);
  const previousDerived = computeDerivedMetrics(previousTotals);
  return { previousRange, previousTotals, previousDerived };
}

// Mesma comparação, mas somando as métricas de várias empresas — usado nos
// links que unem os dados de mais de um cliente num relatório só.
export async function computePreviousPeriodComparisonForClients(
  clientIds: string[],
  range: DateRange
): Promise<PeriodComparison> {
  const previousRange = previousPeriod(range);
  const rowsPerClient = await Promise.all(
    clientIds.map((id) => getMetricsInRange(id, previousRange.start, previousRange.end))
  );
  const rows = rowsPerClient.flat();
  const previousTotals = sumRows(rows, previousRange.start, previousRange.end);
  const previousDerived = computeDerivedMetrics(previousTotals);
  return { previousRange, previousTotals, previousDerived };
}
