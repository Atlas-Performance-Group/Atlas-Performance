// Camada de abstração de geolocalização de IP: nenhum ponto do sistema fora
// de lib/geo/ deve conhecer o provedor concreto usado. Trocar de provedor
// (ou adicionar um novo com fallback) significa mexer só nesta pasta.

export type LocationAccuracy = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type NetworkType =
  | "RESIDENTIAL_ESTIMATED"
  | "BUSINESS_ESTIMATED"
  | "DATACENTER"
  | "HOSTING"
  | "INSTITUTIONAL_ESTIMATED"
  | "ISP_RESIDENTIAL"
  | "VPN_PROXY"
  | "UNKNOWN";

export type IPGeoResult = {
  ip: string;
  provider: string;
  queried_at: string;

  // Localização — cada campo é null quando o provedor não devolveu o dado.
  // Nunca inventamos um valor para preencher um campo ausente.
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  postal_code: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: LocationAccuracy;

  // Rede / organização
  asn: string | null;
  isp: string | null;
  organization: string | null;
  domain: string | null;
  network_type: NetworkType;

  // Sinais de segurança — só true/false quando o provedor de fato informa;
  // null significa "não disponível", nunca é tratado como "false".
  is_proxy: boolean | null;
  is_vpn: boolean | null;
  is_tor: boolean | null;
  is_hosting: boolean | null;
  is_datacenter: boolean | null;
  abuse_score: number | null; // 0-100, quando o provedor fornece reputação

  // Enriquecimento opcional (AbuseIPDB) — só preenchido quando
  // ABUSEIPDB_API_KEY está configurada. Reverse DNS não depende de chave,
  // é resolução de DNS padrão.
  abuse_reports_count: number | null;
  abuse_is_whitelisted: boolean | null;
  reverse_dns: string | null;

  raw_ok: boolean;
  error: string | null;
};

export interface IPGeolocationProvider {
  readonly name: string;
  lookup(ip: string): Promise<IPGeoResult>;
}
