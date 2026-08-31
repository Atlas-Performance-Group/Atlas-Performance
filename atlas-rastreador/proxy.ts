import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { SESSION_COOKIE, timingSafeEqual, verifySessionValue } from "./lib/auth";
import { getRequestIp, logEvent } from "./lib/auditLog";
import { recordAccess } from "./lib/ipTracking";

// Rotas que usam autenticação própria em vez de sessão de admin:
// /api/ingest (secret compartilhado, chamado por outros sistemas Atlas) e
// /api/cleanup (secret de cron do Vercel). Comparação em tempo constante,
// igual à senha de login — não há motivo pra esses secrets serem menos
// protegidos contra timing attack do que o ADMIN_PASSWORD.
function isServiceAuthorized(request: NextRequest, pathname: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (pathname.startsWith("/api/ingest")) {
    const secret = process.env.INGEST_SECRET;
    return !!secret && timingSafeEqual(header, `Bearer ${secret}`);
  }
  if (pathname.startsWith("/api/cleanup")) {
    const secret = process.env.CRON_SECRET;
    return !!secret && timingSafeEqual(header, `Bearer ${secret}`);
  }
  return false;
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // Compatibilidade com o caminho antigo (/admin/rastreador/...), de quando
  // isso era uma aba dentro do painel-metricas. Links salvos, autocomplete
  // do navegador ou favoritos antigos continuam funcionando em vez de dar
  // 404 — redireciona pro caminho atual (/painel/...) preservando o resto
  // da URL e a query string.
  if (pathname.startsWith("/admin/rastreador") || pathname === "/admin") {
    const rest = pathname.replace(/^\/admin\/rastreador/, "").replace(/^\/admin$/, "");
    const target = new URL(`/painel${rest}`, request.url);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target);
  }

  const isServiceRoute = pathname.startsWith("/api/ingest") || pathname.startsWith("/api/cleanup");
  const isProtectedApi =
    pathname.startsWith("/api/ips") ||
    pathname.startsWith("/api/stats") ||
    pathname.startsWith("/api/logs") ||
    isServiceRoute;
  const isProtectedPage = pathname.startsWith("/painel");

  if (!isProtectedApi && !isProtectedPage) {
    return NextResponse.next();
  }

  if (isServiceRoute) {
    if (isServiceAuthorized(request, pathname)) return NextResponse.next();
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionValue(cookie);
  const ip = getRequestIp(request);

  if (valid) {
    // O próprio Atlas Rastreador também reporta o próprio painel de acesso —
    // navegar nele conta como um acesso monitorado, igual a qualquer outro
    // sistema que reporta via /api/ingest.
    event.waitUntil(recordAccess({ ip, source: "atlas-rastreador", endpoint: pathname, method: request.method, status: 200 }));
    return NextResponse.next();
  }

  event.waitUntil(
    Promise.all([
      logEvent({
        type: "unauthorized_access_attempt",
        message: `Tentativa de acessar "${pathname}" sem estar autenticado.`,
        metadata: { pathname },
        ip,
      }),
      recordAccess({ ip, source: "atlas-rastreador", endpoint: pathname, method: request.method, status: 401 }),
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
    "/painel/:path*",
    "/admin/:path*",
    "/api/ips/:path*",
    "/api/stats/:path*",
    "/api/logs/:path*",
    "/api/ingest/:path*",
    "/api/cleanup/:path*",
  ],
};
