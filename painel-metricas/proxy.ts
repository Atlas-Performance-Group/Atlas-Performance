import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "./lib/auth";
import { getRequestIp, logEvent } from "./lib/auditLog";
import { recordAccess } from "./lib/ipTracking";

// Rotas do Atlas Rastreador que precisam do secret de cron em vez de sessão
// de admin (chamadas automatizadas pelo Vercel Cron, sem cookie de browser).
function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  const isCronRoute = pathname.startsWith("/api/rastreador/cleanup");
  const isProtectedApi =
    pathname.startsWith("/api/clients") ||
    pathname.startsWith("/api/links") ||
    pathname.startsWith("/api/logs") ||
    pathname.startsWith("/api/push") ||
    pathname.startsWith("/api/rastreador");
  const isProtectedPage = pathname.startsWith("/admin");

  if (!isProtectedApi && !isProtectedPage) {
    return NextResponse.next();
  }

  if (isCronRoute && isCronAuthorized(request)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionValue(cookie);
  const ip = getRequestIp(request);

  if (valid) {
    // Alimenta o Atlas Rastreador com todo acesso autenticado a rota
    // monitorada, sem bloquear a resposta (waitUntil roda em background).
    event.waitUntil(recordAccess({ ip, endpoint: pathname, method: request.method, status: 200 }));
    return NextResponse.next();
  }

  // Alguém tentou acessar uma rota protegida (painel admin ou API interna)
  // sem sessão válida — ex: um cliente tentando adivinhar /admin a partir
  // do link público. Fica registrado no /admin/logs e no Atlas Rastreador.
  event.waitUntil(
    Promise.all([
      logEvent({
        type: "unauthorized_access_attempt",
        message: `Tentativa de acessar "${pathname}" sem estar autenticado.`,
        metadata: { pathname },
        ip,
      }),
      recordAccess({ ip, endpoint: pathname, method: request.method, status: 401 }),
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
  matcher: [
    "/admin/:path*",
    "/api/clients/:path*",
    "/api/links/:path*",
    "/api/logs/:path*",
    "/api/push/:path*",
    "/api/rastreador/:path*",
  ],
};
