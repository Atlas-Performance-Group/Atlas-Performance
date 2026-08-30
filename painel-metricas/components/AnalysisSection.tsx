import type { ClientReport } from "@/lib/types";
import { InsightsList } from "./InsightsList";
import { CampaignPerformanceChart } from "./CampaignPerformanceChart";

export function AnalysisSection({ report }: { report: ClientReport }) {
  return (
    <div className="flex flex-col gap-6">
      <InsightsList insights={report.insights} />
      <CampaignPerformanceChart
        rows={report.daily}
        targetCostPerConversation={report.client.target_cost_per_conversation}
      />
    </div>
  );
}
