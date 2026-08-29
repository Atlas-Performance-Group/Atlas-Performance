import { NextResponse } from "next/server";
import { createClient, listClients } from "@/lib/data";

export async function GET() {
  const clients = await listClients();
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Nome do cliente é obrigatório." }, { status: 400 });
  }
  const businessLabel = typeof body.businessLabel === "string" ? body.businessLabel.trim() : "";
  const logoUrl = typeof body.logoUrl === "string" && body.logoUrl.trim() ? body.logoUrl.trim() : null;
  const targetCostPerConversation =
    typeof body.targetCostPerConversation === "number" && body.targetCostPerConversation > 0
      ? body.targetCostPerConversation
      : null;

  const client = await createClient({ name, businessLabel, logoUrl, targetCostPerConversation });
  return NextResponse.json({ client }, { status: 201 });
}
