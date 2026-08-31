export type IpVersion = "IPv4" | "IPv6";

const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

// IPv6 validation via a permissive-but-anchored pattern is error prone, so
// this delegates to the URL parser (accepts "[::1]" style, which we strip)
// — every JS runtime implements RFC 3986 host parsing, so this is a
// reliable IPv6 check without hand-rolling regex edge cases.
//
// We only check that the parse *succeeds* (garbage like "not:valid:zz" or
// "::1%eth0" throws) — we don't compare the parsed hostname against the
// original string, because the URL parser canonicalizes valid addresses
// (collapses leading zeros, applies "::" compression), so a fully expanded
// but perfectly valid address like "2001:0db8:0000:...:0001" would never
// match its own canonical form and would be wrongly rejected.
function isValidIpv6(value: string): boolean {
  if (!value.includes(":")) return false;
  try {
    new URL(`http://[${value}]`);
    return true;
  } catch {
    return false;
  }
}

export function detectIpVersion(ip: string): IpVersion | null {
  const trimmed = ip.trim();
  if (IPV4_RE.test(trimmed)) return "IPv4";
  if (isValidIpv6(trimmed)) return "IPv6";
  return null;
}

export function isValidIp(ip: string): boolean {
  return detectIpVersion(ip) !== null;
}

// Canonicaliza o IP antes de usar como chave (ip_records._id,
// ip_geo_cache._id, filtro de eventos): sem isso, o mesmo endereço IPv6
// digitado em notações diferentes (ex: "::1" vs. sua forma totalmente
// expandida) viraria dois registros separados, dividindo contagem de
// acessos, risco e cache de geolocalização entre eles.
export function normalizeIp(ip: string): string {
  const trimmed = ip.trim().toLowerCase();
  if (trimmed.includes(":")) {
    try {
      const hostname = new URL(`http://[${trimmed}]`).hostname;
      return hostname.slice(1, -1); // remove os colchetes "[...]"
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

const PRIVATE_IPV4_RANGES: [string, number][] = [
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
];

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const version = detectIpVersion(ip);
  if (version === "IPv4") {
    const asInt = ipv4ToInt(ip);
    return PRIVATE_IPV4_RANGES.some(([base, prefix]) => {
      const baseInt = ipv4ToInt(base);
      const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
      return (asInt & mask) === (baseInt & mask);
    });
  }
  if (version === "IPv6") {
    const lower = ip.trim().toLowerCase();
    return lower === "::1" || lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd");
  }
  return false;
}
