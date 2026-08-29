import { NextResponse } from "next/server";
import { createSharedLink, getClientsByIds, getMetricsInRange, listSharedLinks, sumRows } from "@/lib/data";
import { computeDerivedMetrics } from "@/lib/metrics";
import { generateInsights } from "@/lib/insights";

export async function GET() {
  const links = await listSharedLinks();
  return NextResponse.json({ links });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const clientIds: string[] = Array.isArray(body.clientIds) ? body.clientIds : [];
  const dateStart = typeof body.dateStart === "string" ? body.dateStart : "";
  const dateEnd = typeof body.dateEnd === "string" ? body.dateEnd : "";
  const mode = body.mode === "frozen" ? "frozen" : "live";
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : null;
  const visibleSections = {
    kpis: Boolean(body.visibleSections?.kpis ?? true),
    indicators: Boolean(body.visibleSections?.indicators ?? true),
    chart: Boolean(body.visibleSections?.chart ?? true),
    table: Boolean(body.visibleSections?.table ?? true),
    insights: Boolean(body.visibleSections?.insights ?? true),
  };

  if (clientIds.length === 0 || !dateStart || !dateEnd) {
    return NextResponse.json(
      { error: "Selecione ao menos um cliente e um intervalo de datas válido." },
      { status: 400 }
    );
  }

  const clients = await getClientsByIds(clientIds);
  if (clients.length === 0) {
    return NextResponse.json({ error: "Nenhum cliente válido encontrado." }, { status: 404 });
  }

  let frozenSnapshot: unknown = undefined;
  if (mode === "frozen") {
    const snapshotData = await Promise.all(
      clients.map(async (client) => {
        const rows = await getMetricsInRange(client.id, dateStart, dateEnd);
        const totals = sumRows(rows, dateStart, dateEnd);
        const derived = computeDerivedMetrics(totals);
        const insights = generateInsights(totals);
        return { clientId: client.id, totals, derived, insights, daily: rows };
      })
    );
    frozenSnapshot = { generatedAt: new Date().toISOString(), data: snapshotData };
  }

  const link = await createSharedLink({
    label,
    clientIds: clients.map((c) => c.id),
    dateStart,
    dateEnd,
    visibleSections,
    mode,
    frozenSnapshot,
  });

  return NextResponse.json({ link }, { status: 201 });
}
