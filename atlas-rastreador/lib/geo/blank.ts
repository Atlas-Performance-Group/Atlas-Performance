import type { IPGeoResult } from "./types";

export function blankResult(ip: string, provider: string): IPGeoResult {
  return {
    ip,
    provider,
    queried_at: new Date().toISOString(),
    country: null,
    country_code: null,
    region: null,
    city: null,
    postal_code: null,
    timezone: null,
    latitude: null,
    longitude: null,
    location_accuracy: "UNKNOWN",
    asn: null,
    isp: null,
    organization: null,
    domain: null,
    network_type: "UNKNOWN",
    is_proxy: null,
    is_vpn: null,
    is_tor: null,
    is_hosting: null,
    is_datacenter: null,
    abuse_score: null,
    raw_ok: false,
    error: null,
  };
}
