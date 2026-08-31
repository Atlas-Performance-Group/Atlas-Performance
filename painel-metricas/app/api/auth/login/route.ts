import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionValue, timingSafeEqual } from "@/lib/auth";
import { countRecentLoginFailures, getRequestIp, logEvent } from "@/lib/auditLog";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 8;

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD não configurada no servidor." }, { status: 500 });
  }

  const recentFailures = await countRecentLoginFailures(ip, RATE_LIMIT_WINDOW_MS);
  if (recentFailures >= RATE_LIMIT_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente." },
      { status: 429 }
    );
  }

  if (!timingSafeEqual(password, process.env.ADMIN_PASSWORD)) {
    await logEvent({ type: "login_failure", message: "Tentativa de login com senha incorreta.", ip });
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const value = await createSessionValue();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  await logEvent({ type: "login_success", message: "Login realizado com sucesso.", ip });
  return NextResponse.json({ ok: true });
}
