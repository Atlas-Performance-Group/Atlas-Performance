import type { IPGeolocationProvider, IPGeoResult, LocationAccuracy } from "../types";
import { blankResult } from "../blank";
import { classifyNetworkType } from "../classify";

// ip-api.com — provedor primário, gratuito, sem chave de API. O plano
// gratuito só responde em HTTP (não HTTPS), mas a chamada é sempre feita
// pelo backend (nunca pelo navegador do cliente), então isso é aceitável.
// https://ip-api.com/docs/api:json
const ENDPOINT = "http://ip-api.com/json";
const FIELDS = [
  "status",
  "message",
  "country",
  "countryCode",
  "region",
  "regionName",
  "city",
  "zip",
  "lat",
  "lon",
  "timezone",
  "isp",
  "org",
  "as",
  "asname",
  "reverse",
  "mobile",
  "proxy",
  "hosting",
  "query",
].join(",");

function accuracyFor(lat: number | null, lon: number | null, city: string | null): LocationAccuracy {
  if (lat !== null && lon !== null && city) return "MEDIUM"; // geoloc de IP nunca é HIGH sem GPS/Wi-Fi
  if (city) return "MEDIUM";
  if (lat !== null && lon !== null) return "LOW";
  return "UNKNOWN";
}

export class IpApiProvider implements IPGeolocationProvider {
  readonly name = "ip-api.com";

  async lookup(ip: string): Promise<IPGeoResult> {
    const result = blankResult(ip, this.name);
    try {
      const res = await fetch(`${ENDPOINT}/${encodeURIComponent(ip)}?fields=${FIELDS}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        result.error = `HTTP ${res.status}`;
        return result;
      }
      const data = await res.json();
      if (data.status !== "success") {
        result.error = typeof data.message === "string" ? data.message : "Consulta falhou.";
        return result;
      }

      const lat = typeof data.lat === "number" ? data.lat : null;
      const lon = typeof data.lon === "number" ? data.lon : null;
      const city = typeof data.city === "string" && data.city ? data.city : null;
      const isHosting = typeof data.hosting === "boolean" ? data.hosting : null;
      const isProxy = typeof data.proxy === "boolean" ? data.proxy : null;
      const isp = typeof data.isp === "string" && data.isp ? data.isp : null;
      const organization = typeof data.org === "string" && data.org ? data.org : null;

      result.country = typeof data.country === "string" && data.country ? data.country : null;
      result.country_code = typeof data.countryCode === "string" && data.countryCode ? data.countryCode : null;
      result.region = typeof data.regionName === "string" && data.regionName ? data.regionName : null;
      result.city = city;
      result.postal_code = typeof data.zip === "string" && data.zip ? data.zip : null;
      result.timezone = typeof data.timezone === "string" && data.timezone ? data.timezone : null;
      result.latitude = lat;
      result.longitude = lon;
      result.location_accuracy = accuracyFor(lat, lon, city);

      result.asn = typeof data.as === "string" && data.as ? data.as : null;
      result.isp = isp;
      result.organization = organization;
      result.domain = null; // ip-api.com free tier não retorna domínio associado

      result.is_hosting = isHosting;
      result.is_datacenter = isHosting; // ip-api não distingue hosting de datacenter puro
      result.is_proxy = isProxy;
      result.is_vpn = isProxy; // sinal combinado (proxy/VPN) — ip-api não separa os dois
      result.is_tor = null; // não informado por este provedor
      result.abuse_score = null; // não informado por este provedor

      result.network_type = classifyNetworkType({
        isp,
        organization,
        domain: null,
        isHosting,
        isDatacenter: isHosting,
        isProxy,
        isVpn: isProxy,
        isTor: null,
      });

      result.raw_ok = true;
      return result;
    } catch (err) {
      result.error = err instanceof Error ? err.message : "Erro desconhecido na consulta.";
      return result;
    }
  }
}
