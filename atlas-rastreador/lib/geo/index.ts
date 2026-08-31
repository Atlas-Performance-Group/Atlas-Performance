// Ponto único de entrada para geolocalização de IP. Nenhuma rota de API ou
// página deve importar um provedor concreto diretamente — sempre passar por
// resolveIpGeo(), que cuida de cache e fallback entre provedores.

import { getDb } from "../db";
import type { IPGeoResult, IPGeolocationProvider } from "./types";
import { IpApiProvider } from "./providers/ipapi";
import { IpInfoProvider } from "./providers/ipinfo";
import { enrichWithAbuseIpDb } from "./enrich/abuseipdb";
import { reverseDnsLookup } from "./reverseDns";

type GeoCacheDoc = IPGeoResult & { _id: string; cached_at: string };

const CACHE_TTL_HOURS = Number(process.env.IP_GEO_CACHE_TTL_HOURS || 24);

function buildProviderChain(): IPGeolocationProvider[] {
  const chain: IPGeolocationProvider[] = [new IpApiProvider()];
  if (process.env.IPINFO_TOKEN) {
    chain.push(new IpInfoProvider(process.env.IPINFO_TOKEN));
  }
  return chain;
}

async function geoCacheCollection() {
  const db = await getDb();
  return db.collection<GeoCacheDoc>("ip_geo_cache");
}

async function getCached(ip: string): Promise<IPGeoResult | null> {
  const col = await geoCacheCollection();
  const doc = await col.findOne({ _id: ip });
  if (!doc) return null;
  const ageMs = Date.now() - new Date(doc.cached_at).getTime();
  if (ageMs > CACHE_TTL_HOURS * 60 * 60 * 1000) return null;
  const { _id, cached_at, ...rest } = doc;
  void _id;
  void cached_at;
  return rest;
}

async function setCached(ip: string, result: IPGeoResult): Promise<void> {
  const col = await geoCacheCollection();
  await col.updateOne(
    { _id: ip },
    { $set: { ...result, _id: ip, cached_at: new Date().toISOString() } },
    { upsert: true }
  );
}

// Consulta os provedores em ordem, usando o primeiro que responder com
// sucesso (raw_ok). Se todos falharem, devolve o último resultado (que traz
// o motivo do erro) para a UI poder explicar o que aconteceu.
export async function resolveIpGeo(ip: string, opts?: { skipCache?: boolean }): Promise<IPGeoResult> {
  if (!opts?.skipCache) {
    const cached = await getCached(ip);
    if (cached) return cached;
  }

  const chain = buildProviderChain();
  let last: IPGeoResult | null = null;
  for (const provider of chain) {
    const result = await provider.lookup(ip);
    last = result;
    if (result.raw_ok) {
      // Enriquecimentos opcionais — nunca bloqueiam nem derrubam a consulta
      // principal se falharem (AbuseIPDB sem chave configurada, DNS sem
      // PTR, timeout, etc.).
      await Promise.all([enrichWithAbuseIpDb(ip, result), reverseDnsLookup(ip).then((h) => (result.reverse_dns = h))]);
      await setCached(ip, result);
      return result;
    }
  }

  if (last) return last;
  throw new Error("Nenhum provedor de geolocalização configurado.");
}

// Pontos geolocalizados recentes, usados pelo mapa geral do dashboard.
// Nunca expõe endereço exato — só coordenadas aproximadas já calculadas
// pelo provedor de geolocalização.
export async function getRecentGeoPoints(limit = 150): Promise<
  { ip: string; lat: number; lon: number; city: string | null; country: string | null; accuracy: IPGeoResult["location_accuracy"] }[]
> {
  const col = await geoCacheCollection();
  const docs = await col
    .find({ latitude: { $ne: null }, longitude: { $ne: null } })
    .sort({ cached_at: -1 })
    .limit(limit)
    .toArray();
  return docs
    .filter((d) => d.latitude !== null && d.longitude !== null)
    .map((d) => ({
      ip: d.ip,
      lat: d.latitude as number,
      lon: d.longitude as number,
      city: d.city,
      country: d.country,
      accuracy: d.location_accuracy,
    }));
}

export type { IPGeoResult, LocationAccuracy, NetworkType, IPGeolocationProvider } from "./types";
