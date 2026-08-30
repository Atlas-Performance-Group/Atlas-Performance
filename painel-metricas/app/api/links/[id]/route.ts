import { NextResponse } from "next/server";
import {
  deleteSharedLink,
  getClientsByIds,
  getSharedLinkById,
  reactivateSharedLink,
  revokeSharedLink,
  updateSharedLink,
} from "@/lib/data";
import { buildFrozenSnapshot } from "@/lib/reportSnapshot";
import { getRequestIp, logEvent } from "@/lib/auditLog";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const ip = getRequestIp(request);

  if (body.action === "revoke") {
    await revokeSharedLink(id);
    await logEvent({ type: "link_revoked", message: `Link ${id} foi revogado.`, metadata: { linkId: id }, ip });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reactivate") {
    await reactivateSharedLink(id);
    await logEvent({
      type: "link_reactivated",
      message: `Link ${id} foi reativado.`,
      metadata: { linkId: id },
      ip,
    });
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

    await logEvent({
      type: "link_updated",
      message: `Link para ${clients.map((c) => c.name).join(", ")} foi editado.`,
      metadata: { linkId: id, clientNames: clients.map((c) => c.name), mode, dateStart, dateEnd },
      ip,
    });

    return NextResponse.json({ link });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const link = await getSharedLinkById(id);
  await deleteSharedLink(id);
  await logEvent({
    type: "link_deleted",
    message: link ? `Link ${link.token} foi excluído.` : `Link ${id} foi excluído.`,
    metadata: { linkId: id, token: link?.token ?? null },
    ip: getRequestIp(request),
  });
  return NextResponse.json({ ok: true });
}
