import { NextResponse } from "next/server";
import { resolveIpGeo } from "@/lib/geo";
import { getIpRecord, listIpHistory, setIpNetworkType } from "@/lib/ipTracking";
import { detectIpVersion, isPrivateOrReservedIp, normalizeIp } from "@/lib/ipValidation";
import { getRequestIp, logEvent } from "@/lib/auditLog";

export async function GET(request: Request, context: { params: Promise<{ ip: string }> }) {
  const { ip: rawIp } = await context.params;
  const ip = normalizeIp(decodeURIComponent(rawIp));
  const version = detectIpVersion(ip);

  if (!version) {
    return NextResponse.json({ error: "IP inválido. Informe um IPv4 ou IPv6 válido." }, { status: 400 });
  }

  if (isPrivateOrReservedIp(ip)) {
    return NextResponse.json(
      { error: "Este é um IP privado/reservado — não há geolocalização pública disponível para ele." },
      { status: 422 }
    );
  }

  try {
    const [geo, record, history] = await Promise.all([
      resolveIpGeo(ip),
      getIpRecord(ip),
      listIpHistory(ip, 100),
    ]);

    if (geo.raw_ok && record) {
      await setIpNetworkType(ip, geo.network_type);
    }

    await logEvent({
      type: "ip_lookup",
      message: `Consulta de geolocalização para o IP ${ip}.`,
      metadata: { ip },
      ip: getRequestIp(request),
    }).catch(() => {});

    return NextResponse.json({ ip, ip_version: version, geo, record, history });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao consultar geolocalização." },
      { status: 502 }
    );
  }
}
