import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "./lib/auth";
import { getRequestIp, logEvent } from "./lib/auditLog";
import { reportAccessToRastreador } from "./lib/rastreadorReport";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  const isProtectedApi =
    pathname.startsWith("/api/clients") ||
    pathname.startsWith("/api/links") ||
    pathname.startsWith("/api/logs") ||
    pathname.startsWith("/api/push");
  const isProtectedPage = pathname.startsWith("/admin");

  if (!isProtectedApi && !isProtectedPage) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionValue(cookie);
  const ip = getRequestIp(request);

  if (valid) {
    // Reporta pro Atlas Rastreador (app separado) sem bloquear a resposta —
    // no-op se ATLAS_RASTREADOR_INGEST_URL/SECRET não estiverem configuradas.
    event.waitUntil(reportAccessToRastreador({ ip, endpoint: pathname, method: request.method, status: 200 }));
    return NextResponse.next();
  }

  // Alguém tentou acessar uma rota protegida (painel admin ou API interna)
  // sem sessão válida — ex: um cliente tentando adivinhar /admin a partir
  // do link público. Fica registrado no /admin/logs.
  event.waitUntil(
    Promise.all([
      logEvent({
        type: "unauthorized_access_attempt",
        message: `Tentativa de acessar "${pathname}" sem estar autenticado.`,
        metadata: { pathname },
        ip,
      }),
      reportAccessToRastreador({ ip, endpoint: pathname, method: request.method, status: 401 }),
    ])
  );

  if (isProtectedApi) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/clients/:path*", "/api/links/:path*", "/api/logs/:path*", "/api/push/:path*"],
};
