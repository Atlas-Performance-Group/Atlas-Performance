import { NextResponse } from "next/server";
import { applyRetentionPolicy } from "@/lib/ipTracking";
import { logEvent } from "@/lib/auditLog";

// Chamado pelo Vercel Cron (autorização por CRON_SECRET, checada em
// proxy.ts) para aplicar a política de retenção configurável
// (ATLAS_RASTREADOR_RETENTION_DAYS).
export async function GET() {
  const result = await applyRetentionPolicy();
  await logEvent({
    type: "retention_applied",
    message: `Retenção aplicada: ${result.deletedEvents} evento(s) removido(s) (política de ${result.retentionDays} dias).`,
    metadata: result,
    ip: null,
  });
  return NextResponse.json(result);
}
