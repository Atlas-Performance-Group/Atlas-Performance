import Link from "next/link";
import { resolveIpGeo } from "@/lib/geo";
import { getIpRecord, listIpHistory, setIpNetworkType } from "@/lib/ipTracking";
import { detectIpVersion, isPrivateOrReservedIp, normalizeIp } from "@/lib/ipValidation";
import { getRequestIp, logEvent } from "@/lib/auditLog";
import { headers } from "next/headers";
import { IpDetailView } from "./IpDetailView";

export const dynamic = "force-dynamic";

export default async function IpDetailPage({ params }: { params: Promise<{ ip: string }> }) {
  const { ip: rawIp } = await params;
  const ip = normalizeIp(decodeURIComponent(rawIp));
  const version = detectIpVersion(ip);

  if (!version) {
    return (
      <ErrorState message={`"${rawIp}" não é um endereço IPv4 ou IPv6 válido.`} />
    );
  }

  if (isPrivateOrReservedIp(ip)) {
    return (
      <ErrorState message={`${ip} é um IP privado/reservado — não há geolocalização pública para consultar.`} />
    );
  }

  let data: Awaited<ReturnType<typeof loadIpDetail>> | null = null;
  let loadError: string | null = null;
  try {
    data = await loadIpDetail(ip);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Falha ao consultar geolocalização.";
  }

  if (loadError || !data) {
    return <ErrorState message={loadError ?? "Falha ao consultar geolocalização."} />;
  }

  return <IpDetailView ip={ip} ipVersion={version} geo={data.geo} record={data.record} history={data.history} />;
}

async function loadIpDetail(ip: string) {
  const [geo, record, history] = await Promise.all([resolveIpGeo(ip), getIpRecord(ip), listIpHistory(ip, 100)]);

  if (geo.raw_ok) {
    await setIpNetworkType(ip, geo.network_type);
  }

  const hdrs = await headers();
  const fakeRequest = new Request("http://internal", { headers: hdrs });
  await logEvent({
    type: "ip_lookup",
    message: `Consulta de geolocalização para o IP ${ip}.`,
    metadata: { ip },
    ip: getRequestIp(fakeRequest),
  }).catch(() => {});

  return { geo, record, history };
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="atlas-card p-6 flex flex-col gap-3">
      <h2 className="font-display text-xl">Localização do IP</h2>
      <p style={{ color: "var(--red-600)" }}>{message}</p>
      <Link href="/admin/rastreador" className="atlas-btn-secondary self-start" style={{ color: "var(--ink)" }}>
        Voltar ao Rastreador
      </Link>
    </div>
  );
}
