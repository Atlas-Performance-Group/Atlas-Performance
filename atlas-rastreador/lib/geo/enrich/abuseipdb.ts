import type { IPGeoResult } from "../types";

// Enriquecimento opcional de reputação via AbuseIPDB (abuseipdb.com/api).
// Diferente dos provedores de geolocalização, isso não faz parte da cadeia
// de fallback — é um passo adicional que só roda quando ABUSEIPDB_API_KEY
// está configurada, e só preenche os campos que o próprio provedor de
// geolocalização não tem (reports/whitelist; abuse_score só é sobrescrito
// se ainda estiver null). Falha aqui nunca derruba a consulta principal.
export async function enrichWithAbuseIpDb(ip: string, result: IPGeoResult): Promise<void> {
  const apiKey = process.env.ABUSEIPDB_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
      {
        headers: { Key: apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return;
    const data = await res.json();
    const info = data?.data;
    if (!info) return;

    if (typeof info.abuseConfidenceScore === "number" && result.abuse_score === null) {
      result.abuse_score = info.abuseConfidenceScore;
    }
    if (typeof info.totalReports === "number") {
      result.abuse_reports_count = info.totalReports;
    }
    if (typeof info.isWhitelisted === "boolean") {
      result.abuse_is_whitelisted = info.isWhitelisted;
    }
    if (typeof info.isTor === "boolean" && result.is_tor === null) {
      result.is_tor = info.isTor;
    }
  } catch {
    // silencioso: AbuseIPDB fora do ar ou limite de requisições atingido
    // não deve impedir o restante da consulta.
  }
}
