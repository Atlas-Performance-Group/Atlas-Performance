import { NextResponse } from "next/server";
import { deleteSharedLink, getClientsByIds, reactivateSharedLink, revokeSharedLink, updateSharedLink } from "@/lib/data";
import { buildFrozenSnapshot } from "@/lib/reportSnapshot";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  if (body.action === "revoke") {
    await revokeSharedLink(id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reactivate") {
    await reactivateSharedLink(id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update") {
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

    const frozenSnapshot = mode === "frozen" ? await buildFrozenSnapshot(clients, dateStart, dateEnd) : undefined;

    const link = await updateSharedLink(id, {
      label,
      clientIds: clients.map((c) => c.id),
      dateStart,
      dateEnd,
      visibleSections,
      mode,
      frozenSnapshot,
    });

    if (!link) {
      return NextResponse.json({ error: "Link não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ link });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await deleteSharedLink(id);
  return NextResponse.json({ ok: true });
}
