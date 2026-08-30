import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { getRequestIp, logEvent } from "@/lib/auditLog";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  await logEvent({ type: "logout", message: "Logout realizado.", ip: getRequestIp(request) });
  return NextResponse.json({ ok: true });
}
