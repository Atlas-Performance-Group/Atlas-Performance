import { NextResponse } from "next/server";
import { recordAccess } from "@/lib/ipTracking";
import { timingSafeEqual } from "@/lib/auth";

// Endpoint de ingestão: qualquer site/API/aplicação da Atlas (painel de
// métricas, sites institucionais, etc.) reporta seus acessos aqui para
// entrar no Atlas Rastreador. Autenticado por secret compartilhado — nunca
// por sessão de admin, já que quem chama é outro sistema, não um navegador.
//
// Corpo esperado: { ip, endpoint, method, status, source?, authenticatedUser?, action? }
// `action` é uma descrição legível do que aconteceu (ex: "Tentativa de
// login falhou"), escrita por quem está reportando — aparece no histórico
// do IP em vez de só método/endpoint/status crus.
export async function POST(request: Request) {
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "INGEST_SECRET não configurada no servidor." }, { status: 500 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const ip = typeof body.ip === "string" ? body.ip : null;
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : null;
  const method = typeof body.method === "string" ? body.method : null;
  const status = typeof body.status === "number" ? body.status : null;
  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim() : "desconhecido";
  const authenticatedUser = typeof body.authenticatedUser === "string" ? body.authenticatedUser : null;
  const action = typeof body.action === "string" && body.action.trim() ? body.action.trim().slice(0, 200) : null;

  if (!ip || !endpoint || !method || status === null) {
    return NextResponse.json({ error: "Campos obrigatórios: ip, endpoint, method, status." }, { status: 400 });
  }

  await recordAccess({ ip, source, endpoint, method, status, authenticatedUser, action });
  return NextResponse.json({ ok: true });
}
