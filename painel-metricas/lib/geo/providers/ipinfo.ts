import type { IPGeolocationProvider, IPGeoResult, LocationAccuracy } from "../types";
import { blankResult } from "../blank";
import { classifyNetworkType } from "../classify";

// ipinfo.io — provedor secundário/fallback, opcional. Só é ativado quando
// IPINFO_TOKEN está configurada no ambiente (a chave nunca é exposta ao
// frontend — esta classe só roda em código de servidor).
// https://ipinfo.io/developers
const ENDPOINT = "https://ipinfo.io";

function accuracyFor(lat: number | null, lon: number | null, city: string | null): LocationAccuracy {
  if (lat !== null && lon !== null && city) return "MEDIUM";
  if (city) return "MEDIUM";
  if (lat !== null && lon !== null) return "LOW";
  return "UNKNOWN";
}

export class IpInfoProvider implements IPGeolocationProvider {
  readonly name = "ipinfo.io";

  constructor(private readonly token: string) {}

  async lookup(ip: string): Promise<IPGeoResult> {
    const result = blankResult(ip, this.name);
    try {
      const res = await fetch(`${ENDPOINT}/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(this.token)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        result.error = `HTTP ${res.status}`;
        return result;
      }
      const data = await res.json();
      if (data.bogon || data.error) {
        result.error = typeof data.error?.message === "string" ? data.error.message : "IP não roteável ou inválido.";
        return result;
      }

      let lat: number | null = null;
      let lon: number | null = null;
      if (typeof data.loc === "string" && data.loc.includes(",")) {
        const [latStr, lonStr] = data.loc.split(",");
        const parsedLat = Number(latStr);
        const parsedLon = Number(lonStr);
        if (Number.isFinite(parsedLat) && Number.isFinite(parsedLon)) {
          lat = parsedLat;
          lon = parsedLon;
        }
      }

      const city = typeof data.city === "string" && data.city ? data.city : null;
      const org = typeof data.org === "string" && data.org ? data.org : null;
      const asnMatch = org?.match(/^AS\d+/)?.[0] ?? null;
      const orgName = org ? org.replace(/^AS\d+\s*/, "") : null;
      const privacy = data.privacy ?? null;
      const isVpn = typeof privacy?.vpn === "boolean" ? privacy.vpn : null;
      const isProxy = typeof privacy?.proxy === "boolean" ? privacy.proxy : null;
      const isTor = typeof privacy?.tor === "boolean" ? privacy.tor : null;
      const isHosting = typeof privacy?.hosting === "boolean" ? privacy.hosting : null;

      result.country = typeof data.country === "string" && data.country ? data.country : null;
      result.country_code = typeof data.country === "string" && data.country ? data.country : null;
      result.region = typeof data.region === "string" && data.region ? data.region : null;
      result.city = city;
      result.postal_code = typeof data.postal === "string" && data.postal ? data.postal : null;
      result.timezone = typeof data.timezone === "string" && data.timezone ? data.timezone : null;
      result.latitude = lat;
      result.longitude = lon;
      result.location_accuracy = accuracyFor(lat, lon, city);

      result.asn = asnMatch;
      result.isp = orgName;
      result.organization = orgName;
      result.domain = typeof data.hostname === "string" && data.hostname ? data.hostname : null;

      result.is_hosting = isHosting;
      result.is_datacenter = isHosting;
      result.is_proxy = isProxy;
      result.is_vpn = isVpn;
      result.is_tor = isTor;
      result.abuse_score = null;

      result.network_type = classifyNetworkType({
        isp: orgName,
        organization: orgName,
        domain: result.domain,
        isHosting,
        isDatacenter: isHosting,
        isProxy,
        isVpn,
        isTor,
      });

      result.raw_ok = true;
      return result;
    } catch (err) {
      result.error = err instanceof Error ? err.message : "Erro desconhecido na consulta.";
      return result;
    }
  }
}
