import { listRecentLogs } from "@/lib/auditLog";
import { LogsView } from "./LogsView";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const logs = await listRecentLogs(200);
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-2xl">
        Registro de <span className="atlas-gold">Atividade</span>
      </h2>
      <LogsView initialLogs={logs} />
    </div>
  );
}
