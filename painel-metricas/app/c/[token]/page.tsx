import { getClientsByIds, getMetricsInRange, getSharedLinkByToken, sumRows } from "@/lib/data";
import { computeDerivedMetrics } from "@/lib/metrics";
import { generateInsights } from "@/lib/insights";
import { aggregateExtraMetrics } from "@/lib/extraMetrics";
import { formatDateBR, formatRangeLabel } from "@/lib/dateRanges";
import { AtlasLogo, ClientLogo } from "@/components/Logo";
import { ReportView } from "@/components/ReportView";
import type { ClientReport } from "@/lib/types";
import type { DailyRow } from "@/lib/data";

export const dynamic = "force-dynamic";

function UnavailableMessage() {
  return (
    <div className="min-h-screen atlas-hero flex items-center justify-center p-6">
      <div className="atlas-card p-8 max-w-md text-center">
        <h1 className="font-display text-2xl mb-3">
          Link <span className="atlas-gold">Indisponível</span>
        </h1>
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          Este link não está mais disponível. Entre em contato com a Atlas Performance Group para receber um
          novo relatório.
        </p>
      </div>
    </div>
  );
}

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await getSharedLinkByToken(token);

  if (!link || link.revoked_at) {
    return <UnavailableMessage />;
  }

  const clients = await getClientsByIds(link.client_ids);
  if (clients.length === 0) {
    return <UnavailableMessage />;
  }

  let reports: ClientReport[];
  let generatedAt = new Date();

  if (link.mode === "frozen" && link.frozen_snapshot) {
    const snapshot = link.frozen_snapshot as {
      generatedAt?: string;
      data: {
        clientId: string;
        totals: ClientReport["totals"];
        derived: ClientReport["derived"];
        insights: ClientReport["insights"];
        daily: DailyRow[];
        extraMetrics: ClientReport["extraMetrics"];
      }[];
    };
    reports = snapshot.data
      .map((entry) => {
        const client = clients.find((c) => c.id === entry.clientId);
        if (!client) return null;
        return {
          client,
          range: { start: link.date_start, end: link.date_end },
          totals: entry.totals,
          derived: entry.derived,
          insights: entry.insights,
          daily: entry.daily,
          extraMetrics: entry.extraMetrics ?? [],
        } satisfies ClientReport;
      })
      .filter((r): r is ClientReport => r !== null);
    if (snapshot.generatedAt) generatedAt = new Date(snapshot.generatedAt);
  } else {
    reports = await Promise.all(
      clients.map(async (client) => {
        const rows = await getMetricsInRange(client.id, link.date_start, link.date_end);
        const totals = sumRows(rows, link.date_start, link.date_end);
        const derived = computeDerivedMetrics(totals);
        const insights = generateInsights(totals);
        const extraMetrics = aggregateExtraMetrics(rows);
        return {
          client,
          range: { start: link.date_start, end: link.date_end },
          totals,
          derived,
          insights,
          daily: rows,
          extraMetrics,
        };
      })
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="atlas-hero px-6 py-10 atlas-fade-in text-center">
        <span className="atlas-hero-badge">Gerado em {formatDateBR(generatedAt)}</span>
        <div className="max-w-5xl mx-auto flex items-center justify-center">
          <AtlasLogo size="md" />
        </div>
        <div className="atlas-hero-divider" />
        <h1 className="max-w-5xl mx-auto font-display text-3xl mt-4">
          MÉTRICAS <span className="atlas-gold">ATLAS</span>
        </h1>
        <p className="max-w-5xl mx-auto text-sm mt-1" style={{ color: "#ffe6a3" }}>
          Painel de Performance · Atlas Performance Group
        </p>
        <p className="max-w-5xl mx-auto text-sm mt-1 font-bold" style={{ color: "#fff8ec" }}>
          Período: {formatRangeLabel({ start: link.date_start, end: link.date_end })}
        </p>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col gap-10">
        {reports.map((report) => (
          <section key={report.client.id} className="flex flex-col gap-4">
            <div className="flex items-center gap-3 atlas-card px-4 py-3" style={{ background: "var(--red-950)" }}>
              <div style={{ color: "#fff8ec" }} className="font-display text-lg">
                ATLAS
              </div>
              <div style={{ color: "var(--gold-400)" }}>×</div>
              <ClientLogo name={report.client.name} logoUrl={report.client.logo_url} />
              {report.client.business_label && (
                <span className="text-xs ml-auto" style={{ color: "#ffe6a3" }}>
                  {report.client.business_label}
                </span>
              )}
            </div>
            <ReportView report={report} sections={link.visible_sections} />
          </section>
        ))}
      </main>

      <footer className="text-center text-xs py-6" style={{ color: "var(--ink-faint)" }}>
        Relatório gerado pela Atlas Performance Group.
      </footer>
    </div>
  );
}
