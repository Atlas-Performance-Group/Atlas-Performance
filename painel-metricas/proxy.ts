import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "./lib/auth";
import { getRequestIp, logEvent } from "./lib/auditLog";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedApi =
    pathname.startsWith("/api/clients") || pathname.startsWith("/api/links") || pathname.startsWith("/api/logs");
  const isProtectedPage = pathname.startsWith("/admin");

  if (!isProtectedApi && !isProtectedPage) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionValue(cookie);

  if (valid) return NextResponse.next();

  // Alguém tentou acessar uma rota protegida (painel admin ou API interna)
  // sem sessão válida — ex: um cliente tentando adivinhar /admin a partir
  // do link público. Fica registrado no /admin/logs.
  await logEvent({
    type: "unauthorized_access_attempt",
    message: `Tentativa de acessar "${pathname}" sem estar autenticado.`,
    metadata: { pathname },
    ip: getRequestIp(request),
  });

  if (isProtectedApi) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/clients/:path*", "/api/links/:path*", "/api/logs/:path*"],
};
