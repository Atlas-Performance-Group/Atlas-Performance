import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionValue, timingSafeEqual } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD não configurada no servidor." }, { status: 500 });
  }

  if (!timingSafeEqual(password, process.env.ADMIN_PASSWORD)) {
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

  return NextResponse.json({ ok: true });
}
