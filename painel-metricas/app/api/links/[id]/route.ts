import { NextResponse } from "next/server";
import { reactivateSharedLink, revokeSharedLink } from "@/lib/data";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  if (body.action === "revoke") {
    await revokeSharedLink(id);
  } else if (body.action === "reactivate") {
    await reactivateSharedLink(id);
  } else {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
