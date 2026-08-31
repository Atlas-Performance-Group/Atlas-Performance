import { NextResponse } from "next/server";
import { listIpRecords, type RiskLevel } from "@/lib/ipTracking";

const VALID_RISK: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const VALID_SORT = ["last_seen", "access_count", "blocked_count", "first_seen"] as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const riskParam = url.searchParams.get("risk");
  const riskLevel = VALID_RISK.includes(riskParam as RiskLevel) ? (riskParam as RiskLevel) : undefined;
  const sortParam = url.searchParams.get("sort");
  const sortBy = (VALID_SORT as readonly string[]).includes(sortParam ?? "")
    ? (sortParam as (typeof VALID_SORT)[number])
    : "last_seen";
  const sortDir = url.searchParams.get("dir") === "asc" ? 1 : -1;
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") || 50)));

  const { items, total } = await listIpRecords({ search, riskLevel, sortBy, sortDir, page, pageSize });
  return NextResponse.json({ items, total, page, pageSize });
}
