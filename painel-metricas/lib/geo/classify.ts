import type { NetworkType } from "./types";

// Classificação do tipo de rede: nunca afirma com certeza que um IP é
// "residencial" ou "empresarial" — quando a fonte não confirma isso
// explicitamente (datacenter/hosting/proxy detectados pelo provedor), o
// resultado é sempre marcado como "_ESTIMATED" e a UI deve deixar isso
// visível para o usuário.
const HOSTING_KEYWORDS = [
  "amazon",
  "aws",
  "google cloud",
  "gcp",
  "microsoft azure",
  "azure",
  "digitalocean",
  "digital ocean",
  "linode",
  "akamai",
  "ovh",
  "hetzner",
  "vultr",
  "cloudflare",
  "oracle cloud",
  "alibaba cloud",
  "scaleway",
  "contabo",
  "hostinger",
  "leaseweb",
];

const INSTITUTIONAL_KEYWORDS = [
  "university",
  "universidade",
  "college",
  "instituto federal",
  "ministerio",
  "ministério",
  "governo",
  "government",
  "prefeitura",
  "secretaria de estado",
  ".gov",
  ".edu",
];

const RESIDENTIAL_ISP_KEYWORDS = [
  "telecom",
  "telefonica",
  "telefônica",
  "vivo",
  "claro",
  "tim ",
  "oi s.a",
  "net virtua",
  "comcast",
  "verizon",
  "at&t",
  "spectrum",
  "cox communications",
  "fibra",
  "broadband",
];

function matchesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export function classifyNetworkType(input: {
  isp: string | null;
  organization: string | null;
  domain: string | null;
  isHosting: boolean | null;
  isDatacenter: boolean | null;
  isProxy: boolean | null;
  isVpn: boolean | null;
  isTor: boolean | null;
}): NetworkType {
  if (input.isTor || input.isVpn || input.isProxy) return "VPN_PROXY";
  if (input.isDatacenter) return "DATACENTER";
  if (input.isHosting) return "HOSTING";

  const text = `${input.isp ?? ""} ${input.organization ?? ""} ${input.domain ?? ""}`.toLowerCase();
  if (!text.trim()) return "UNKNOWN";

  if (matchesAny(text, HOSTING_KEYWORDS)) return "HOSTING";
  if (matchesAny(text, INSTITUTIONAL_KEYWORDS)) return "INSTITUTIONAL_ESTIMATED";
  if (matchesAny(text, RESIDENTIAL_ISP_KEYWORDS)) return "ISP_RESIDENTIAL";
  if (text.includes("ltda") || text.includes("s.a.") || text.includes("corp") || text.includes("inc.")) {
    return "BUSINESS_ESTIMATED";
  }
  return "RESIDENTIAL_ESTIMATED";
}

export const NETWORK_TYPE_LABELS: Record<NetworkType, string> = {
  RESIDENTIAL_ESTIMATED: "Residencial — estimativa",
  BUSINESS_ESTIMATED: "Empresarial — estimativa",
  DATACENTER: "Data center — identificado",
  HOSTING: "Hosting — identificado",
  INSTITUTIONAL_ESTIMATED: "Institucional — estimativa",
  ISP_RESIDENTIAL: "ISP residencial — identificado",
  VPN_PROXY: "VPN/Proxy — identificado",
  UNKNOWN: "Desconhecido",
};
