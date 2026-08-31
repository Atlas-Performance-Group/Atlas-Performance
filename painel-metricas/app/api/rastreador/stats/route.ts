import { NextResponse } from "next/server";
import { getAccessesByDay, getAccessesByHour, getDashboardStats } from "@/lib/ipTracking";
import { getRecentGeoPoints } from "@/lib/geo";

export async function GET() {
  const [stats, byHour, byDay, geoPoints] = await Promise.all([
    getDashboardStats(),
    getAccessesByHour(24),
    getAccessesByDay(14),
    getRecentGeoPoints(150),
  ]);
  return NextResponse.json({ stats, byHour, byDay, geoPoints });
}
