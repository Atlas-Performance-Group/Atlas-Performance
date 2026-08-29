import { NextResponse } from "next/server";
import { getClient, getMetricsInRange, sumRows } from "@/lib/data";
import { computeDerivedMetrics } from "@/lib/metrics";
import { generateInsights } from "@/lib/insights";
import { aggregateExtraMetrics } from "@/lib/extraMetrics";

export async function GET(request: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await ctx.params;
  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "Parâmetros start e end são obrigatórios (yyyy-mm-dd)." }, { status: 400 });
  }

  const client = await getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  const rows = await getMetricsInRange(clientId, start, end);
  const totals = sumRows(rows, start, end);
  const derived = computeDerivedMetrics(totals);
  const insights = generateInsights(totals);
  const extraMetrics = aggregateExtraMetrics(rows);

  return NextResponse.json({
    client,
    range: { start, end },
    totals,
    derived,
    insights,
    daily: rows,
    extraMetrics,
  });
}
