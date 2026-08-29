import type { Client, DailyRow } from "./data";
import type { DerivedMetrics, MetricsTotals } from "./metrics";
import type { Insight } from "./insights";

export type VisibleSections = {
  kpis: boolean;
  indicators: boolean;
  chart: boolean;
  table: boolean;
  insights: boolean;
};

export type ClientReport = {
  client: Client;
  range: { start: string; end: string };
  totals: MetricsTotals;
  derived: DerivedMetrics;
  insights: Insight[];
  daily: DailyRow[];
};
