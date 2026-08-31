import { listIpRecords } from "@/lib/ipTracking";
import { HistoricoTable } from "./HistoricoTable";

export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  const { items, total } = await listIpRecords({ pageSize: 50 });
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-2xl">
        Histórico de <span className="atlas-gold">IPs</span>
      </h2>
      <HistoricoTable initialItems={items} initialTotal={total} />
    </div>
  );
}
