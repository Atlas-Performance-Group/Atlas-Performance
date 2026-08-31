import { NextResponse } from "next/server";
import { createSharedLink, getClientsByIds, listSharedLinks } from "@/lib/data";
import { buildFrozenSnapshot } from "@/lib/reportSnapshot";
import { getRequestIp, logEvent } from "@/lib/auditLog";

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
  const merge = Boolean(body.merge) && clientIds.length > 1;
  const visibleSections = {
    kpis: Boolean(body.visibleSections?.kpis ?? true),
    indicators: Boolean(body.visibleSections?.indicators ?? true),
    dailyEvolution: Boolean(body.visibleSections?.dailyEvolution ?? true),
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

  const frozenSnapshot =
    mode === "frozen" ? await buildFrozenSnapshot(clients, dateStart, dateEnd, merge) : undefined;

  const link = await createSharedLink({
    label,
    clientIds: clients.map((c) => c.id),
    merge,
    dateStart,
    dateEnd,
    visibleSections,
    mode,
    frozenSnapshot,
  });

  await logEvent({
    type: "link_created",
    message: `Link criado para ${clients.map((c) => c.name).join(", ")} (modo ${mode === "frozen" ? "fixo" : "ao vivo"}).`,
    metadata: { linkId: link.id, token: link.token, clientNames: clients.map((c) => c.name), mode, dateStart, dateEnd },
    ip: getRequestIp(request),
  });

  return NextResponse.json({ link }, { status: 201 });
}
