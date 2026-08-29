import { NextResponse } from "next/server";
import { getClient, upsertDailyMetrics } from "@/lib/data";
import { parseMetaAdsCsv } from "@/lib/csv";

export async function POST(request: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await ctx.params;
  const client = await getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie o CSV no campo 'file'." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  } catch {
    text = new TextDecoder("latin1").decode(buffer);
  }

  const { rows, warnings, isDaily } = parseMetaAdsCsv(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Não foi possível extrair dados do CSV.", warnings }, { status: 422 });
  }

  const { inserted, updated } = await upsertDailyMetrics(clientId, rows);

  return NextResponse.json({
    ok: true,
    isDaily,
    warnings,
    rowsParsed: rows.length,
    inserted,
    updated,
  });
}
