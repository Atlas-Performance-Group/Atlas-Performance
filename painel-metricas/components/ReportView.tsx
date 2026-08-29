import type { ClientReport, VisibleSections } from "@/lib/types";
import { KpiCards } from "./KpiCards";
import { IndicatorGrid } from "./IndicatorGrid";
import { DailyChart } from "./DailyChart";
import { DailyTable } from "./DailyTable";
import { InsightsList } from "./InsightsList";

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
    <div className="flex flex-col gap-6">
      {sections.kpis && <KpiCards report={report} />}
      {sections.indicators && <IndicatorGrid report={report} />}
      {sections.chart && <DailyChart rows={report.daily} />}
      {sections.table && <DailyTable rows={report.daily} />}
      {sections.insights && <InsightsList insights={report.insights} />}
    </div>
  );
}
