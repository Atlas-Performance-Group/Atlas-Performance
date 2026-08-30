import type { ClientReport, VisibleSections } from "@/lib/types";
import { KpiCards } from "./KpiCards";
import { IndicatorGrid } from "./IndicatorGrid";
import { DailyChart } from "./DailyChart";
import { DailyTable } from "./DailyTable";
import { AnalysisSection } from "./AnalysisSection";
import { ExtraMetricsCard } from "./ExtraMetricsCard";

const DEFAULT_SECTIONS: VisibleSections = {
  kpis: true,
  indicators: true,
  chart: true,
  table: true,
  insights: true,
};

export function ReportView({
  report,
  sections = DEFAULT_SECTIONS,
}: {
  report: ClientReport;
  sections?: VisibleSections;
}) {
  return (
    <div className="flex flex-col gap-6 atlas-stagger">
      {sections.kpis && <KpiCards report={report} />}
      {sections.indicators && <IndicatorGrid report={report} />}
      {sections.indicators && <ExtraMetricsCard metrics={report.extraMetrics} />}
      {sections.chart && <DailyChart rows={report.daily} />}
      {sections.table && <DailyTable rows={report.daily} />}
      {sections.insights && <AnalysisSection report={report} />}
    </div>
  );
}
