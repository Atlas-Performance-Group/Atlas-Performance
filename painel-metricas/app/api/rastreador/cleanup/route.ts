import { NextResponse } from "next/server";
import { applyRetentionPolicy } from "@/lib/ipTracking";
import { logEvent } from "@/lib/auditLog";

// Chamado pelo Vercel Cron (ou manualmente por um admin autenticado) para
// aplicar a política de retenção configurável de ATLAS_RASTREADOR_RETENTION_DAYS.
// A autorização (secret de cron OU sessão de admin) é validada em proxy.ts.
export async function GET() {
  const result = await applyRetentionPolicy();
  await logEvent({
    type: "metrics_reset",
    message: `Retenção do Atlas Rastreador aplicada: ${result.deletedEvents} evento(s) removido(s) (política de ${result.retentionDays} dias).`,
    metadata: result,
    ip: null,
  });
  return NextResponse.json(result);
}
