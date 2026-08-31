import { NextResponse } from "next/server";
import { listRecentLogs } from "@/lib/auditLog";

export async function GET() {
  const logs = await listRecentLogs(200);
  return NextResponse.json({ logs });
}
