import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionValue, timingSafeEqual } from "@/lib/auth";
import { getRequestIp, hasSuccessfulLoginFromIp, logEvent } from "@/lib/auditLog";
import { notifyAdmins } from "@/lib/pushNotifications";
import { reportAccessToRastreador } from "@/lib/rastreadorReport";

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD não configurada no servidor." }, { status: 500 });
  }

  if (!timingSafeEqual(password, process.env.ADMIN_PASSWORD)) {
    await logEvent({ type: "login_failure", message: "Tentativa de login com senha incorreta.", ip });
    await Promise.all([
      reportAccessToRastreador({ ip, endpoint: "/api/auth/login", method: "POST", status: 401 }),
      notifyAdmins({
        title: "Tentativa de login falhou",
        body: `IP ${ip ?? "desconhecido"} tentou entrar no Painel de Métricas com senha incorreta.`,
        url: "/admin/logs",
      }),
    ]).catch(() => {});
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  // Verifica ANTES de gravar o login atual, pra saber se esse IP já tinha
  // entrado com sucesso alguma vez antes (destaca "IP novo" na notificação).
  const isKnownIp = await hasSuccessfulLoginFromIp(ip).catch(() => true);

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
  await Promise.all([
    reportAccessToRastreador({ ip, endpoint: "/api/auth/login", method: "POST", status: 200 }),
    notifyAdmins({
      title: isKnownIp ? "Login no Painel de Métricas" : "⚠️ Login de um IP novo",
      body: isKnownIp
        ? `IP ${ip ?? "desconhecido"} entrou com sucesso.`
        : `IP ${ip ?? "desconhecido"} nunca tinha acessado antes e entrou com sucesso agora.`,
      url: "/admin/logs",
    }),
  ]).catch(() => {});
  return NextResponse.json({ ok: true });
}
