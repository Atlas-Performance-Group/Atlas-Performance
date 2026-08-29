import { listClients, listSharedLinks } from "@/lib/data";
import { LinksTable } from "./LinksTable";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const [links, clients] = await Promise.all([listSharedLinks(), listClients()]);
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-2xl">
        Links Gerados para <span className="atlas-gold">Clientes</span>
      </h2>
      <LinksTable links={links} clients={clients} />
    </div>
  );
}
