import { listClients } from "@/lib/data";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const clients = await listClients();
  return <AdminDashboard initialClients={clients} />;
}
