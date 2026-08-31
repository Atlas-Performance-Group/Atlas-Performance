export type IpVersion = "IPv4" | "IPv6";

const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

// IPv6 validation via a permissive-but-anchored pattern is error prone, so
// this delegates to the URL parser (accepts "[::1]" style, which we strip)
// — every JS runtime implements RFC 3986 host parsing, so this is a
// reliable IPv6 check without hand-rolling regex edge cases.
function isValidIpv6(value: string): boolean {
  if (!value.includes(":")) return false;
  try {
    const url = new URL(`http://[${value}]`);
    return url.hostname === `[${value.toLowerCase()}]`;
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

export function normalizeIp(ip: string): string {
  return ip.trim().toLowerCase();
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
