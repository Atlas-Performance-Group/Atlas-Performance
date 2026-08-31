import { NextResponse } from "next/server";
import { listIpRecords, RISK_LABELS } from "@/lib/ipTracking";
import { NETWORK_TYPE_LABELS } from "@/lib/geo/classify";

function csvEscape(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET() {
  const { items } = await listIpRecords({ pageSize: 200, sortBy: "last_seen", sortDir: -1 });
  const header = [
    "IP",
    "Versão",
    "Primeiro acesso",
    "Último acesso",
    "Acessos",
    "Bloqueios",
    "Risco",
    "Tipo de rede",
    "Origem",
    "Última ação",
  ];
  const rows = items.map((r) =>
    [
      r.ip,
      r.ip_version,
      r.first_seen,
      r.last_seen,
      r.access_count,
      r.blocked_count,
      RISK_LABELS[r.risk_level],
      r.network_type ? NETWORK_TYPE_LABELS[r.network_type] : "Não consultado",
      r.last_source ?? "",
      r.last_action ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );
  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="atlas-rastreador-ips-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
