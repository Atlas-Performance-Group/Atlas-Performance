import { getAccessesByDay, getAccessesByHour, getDashboardStats } from "@/lib/ipTracking";
import { getRecentGeoPoints } from "@/lib/geo";
import { RastreadorDashboard } from "./RastreadorDashboard";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const [stats, byHour, byDay, geoPoints] = await Promise.all([
    getDashboardStats(),
    getAccessesByHour(24),
    getAccessesByDay(14),
    getRecentGeoPoints(150),
  ]);

  return (
    <RastreadorDashboard
      initialStats={stats}
      initialByHour={byHour}
      initialByDay={byDay}
      initialGeoPoints={geoPoints}
    />
  );
}
