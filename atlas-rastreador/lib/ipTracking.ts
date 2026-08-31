// Rastreamento de acessos por IP: coleção de eventos crus (ip_access_events)
// + um registro agregado por IP (ip_records) mantido incrementalmente para
// as consultas do dashboard não precisarem varrer todos os eventos.
//
// Privacidade: só gravamos o necessário para segurança/auditoria — método,
// endpoint, status, IP, timestamp e (quando existir) um identificador de
// usuário autenticado. Nunca senha, cookie completo, token ou corpo da
// requisição.

import { getDb } from "./db";
import { nanoid } from "nanoid";
import { detectIpVersion, isPrivateOrReservedIp, normalizeIp } from "./ipValidation";
import { escapeRegExp } from "./regex";
import { describeEvent } from "./eventDescription";
import type { NetworkType } from "./geo/types";
import type { RiskLevel } from "./risk";
export type { RiskLevel } from "./risk";
export { RISK_LABELS } from "./risk";

export type IpAccessEvent = {
  id: string;
  ip: string;
  ip_version: "IPv4" | "IPv6";
  source: string;
  endpoint: string;
  method: string;
  status: number;
  blocked: boolean;
  authenticated_user: string | null;
  // Descrição legível da ação, escrita por quem reporta o evento (ex:
  // "Tentativa de login falhou"). Null nos eventos antigos e nos genéricos
  // de navegação (proxy.ts não sabe o significado de negócio da rota) — a
  // UI cai para uma descrição genérica a partir de método/endpoint/status.
  action: string | null;
  created_at: string;
};

type IpAccessEventDoc = Omit<IpAccessEvent, "id"> & { _id: string };

export type IpRecord = {
  ip: string;
  ip_version: "IPv4" | "IPv6";
  first_seen: string;
  last_seen: string;
  access_count: number;
  blocked_count: number;
  risk_level: RiskLevel;
  risk_reason: string;
  network_type: NetworkType | null;
  is_private: boolean;
  // Do último evento registrado — pra tabela de histórico mostrar de onde
  // veio e o que aconteceu sem precisar abrir o detalhe de cada IP.
  last_source: string | null;
  last_action: string | null;
  // Preenchidos via join com o cache de geolocalização (lib/geo) só para
  // exibição na tabela — null quando o IP nunca foi consultado.
  country?: string | null;
  city?: string | null;
  organization?: string | null;
};

type IpRecordDoc = Omit<IpRecord, "ip"> & { _id: string };

async function eventsCollection() {
  const db = await getDb();
  return db.collection<IpAccessEventDoc>("ip_access_events");
}

async function recordsCollection() {
  const db = await getDb();
  return db.collection<IpRecordDoc>("ip_records");
}

function isBlockedStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 429;
}

function computeRisk(input: { accessCount: number; blockedCount: number; networkType: NetworkType | null }): {
  level: RiskLevel;
  reason: string;
} {
  const { accessCount, blockedCount } = input;
  const blockRatio = accessCount > 0 ? blockedCount / accessCount : 0;

  if (blockedCount >= 20 || (blockedCount >= 10 && blockRatio > 0.6)) {
    return { level: "CRITICAL", reason: "Volume alto de tentativas bloqueadas (401/403/429)." };
  }
  if (blockedCount >= 8 || (blockedCount >= 4 && blockRatio > 0.4)) {
    return { level: "HIGH", reason: "Múltiplas tentativas de autenticação malsucedidas." };
  }
  if (blockedCount >= 2 || input.networkType === "VPN_PROXY") {
    return {
      level: "MEDIUM",
      reason:
        blockedCount >= 2
          ? "Algumas tentativas bloqueadas registradas."
          : "Acesso via rede identificada como VPN/Proxy.",
    };
  }
  return { level: "LOW", reason: "Sem eventos suspeitos relevantes." };
}

// Chamado de forma não bloqueante (fire-and-forget) pelo proxy.ts a cada
// requisição em rota monitorada. Nunca deve derrubar a requisição original.
export async function recordAccess(input: {
  ip: string | null;
  source?: string;
  endpoint: string;
  method: string;
  status: number;
  authenticatedUser?: string | null;
  action?: string | null;
}): Promise<void> {
  if (!input.ip) return;
  const ip = normalizeIp(input.ip);
  const version = detectIpVersion(ip);
  if (!version) return; // não grava lixo não-IP (ex: valor malformado de header)

  const blocked = isBlockedStatus(input.status);
  const now = new Date().toISOString();

  try {
    const events = await eventsCollection();
    const doc: IpAccessEventDoc = {
      _id: nanoid(),
      ip,
      ip_version: version,
      source: input.source ?? "atlas-rastreador",
      endpoint: input.endpoint,
      method: input.method,
      status: input.status,
      action: input.action ?? null,
      blocked,
      authenticated_user: input.authenticatedUser ?? null,
      created_at: now,
    };
    await events.insertOne(doc);

    const records = await recordsCollection();
    const existing = await records.findOne({ _id: ip });
    const accessCount = (existing?.access_count ?? 0) + 1;
    const blockedCount = (existing?.blocked_count ?? 0) + (blocked ? 1 : 0);
    const { level, reason } = computeRisk({
      accessCount,
      blockedCount,
      networkType: existing?.network_type ?? null,
    });

    await records.updateOne(
      { _id: ip },
      {
        $set: {
          ip_version: version,
          last_seen: now,
          access_count: accessCount,
          blocked_count: blockedCount,
          risk_level: level,
          risk_reason: reason,
          is_private: isPrivateOrReservedIp(ip),
          last_source: doc.source,
          last_action: describeEvent(doc),
        },
        $setOnInsert: { first_seen: now, network_type: null },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("Falha ao registrar acesso do Atlas Rastreador:", err);
  }
}

export async function getIpRecord(ip: string): Promise<IpRecord | null> {
  const records = await recordsCollection();
  const doc = await records.findOne({ _id: normalizeIp(ip) });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ip: _id, ...rest };
}

export async function setIpNetworkType(ip: string, networkType: NetworkType): Promise<void> {
  const records = await recordsCollection();
  const existing = await records.findOne({ _id: normalizeIp(ip) });
  const { level, reason } = computeRisk({
    accessCount: existing?.access_count ?? 0,
    blockedCount: existing?.blocked_count ?? 0,
    networkType,
  });
  await records.updateOne(
    { _id: normalizeIp(ip) },
    { $set: { network_type: networkType, risk_level: level, risk_reason: reason } }
  );
}

export async function listIpHistory(ip: string, limit = 100): Promise<IpAccessEvent[]> {
  const events = await eventsCollection();
  const docs = await events
    .find({ ip: normalizeIp(ip) })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
  return docs.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
}

export type IpListFilter = {
  search?: string;
  riskLevel?: RiskLevel;
  sortBy?: "last_seen" | "access_count" | "blocked_count" | "first_seen";
  sortDir?: 1 | -1;
  page?: number;
  pageSize?: number;
};

export async function listIpRecords(filter: IpListFilter = {}): Promise<{ items: IpRecord[]; total: number }> {
  const records = await recordsCollection();
  const query: Record<string, unknown> = {};
  if (filter.search) {
    query._id = { $regex: escapeRegExp(filter.search.trim().slice(0, 100)), $options: "i" };
  }
  if (filter.riskLevel) {
    query.risk_level = filter.riskLevel;
  }

  const sortField = filter.sortBy ?? "last_seen";
  const sortDir = filter.sortDir ?? -1;
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 50));

  type Row = IpRecordDoc & { geo?: { country: string | null; city: string | null; organization: string | null }[] };

  const [docs, total] = await Promise.all([
    records
      .aggregate<Row>([
        { $match: query },
        { $sort: { [sortField]: sortDir } },
        { $skip: (page - 1) * pageSize },
        { $limit: pageSize },
        {
          $lookup: {
            from: "ip_geo_cache",
            localField: "_id",
            foreignField: "_id",
            as: "geo",
            pipeline: [{ $project: { country: 1, city: 1, organization: 1 } }],
          },
        },
      ])
      .toArray(),
    records.countDocuments(query),
  ]);

  return {
    items: docs.map(({ _id, geo, ...rest }) => ({
      ip: _id,
      ...rest,
      country: geo?.[0]?.country ?? null,
      city: geo?.[0]?.city ?? null,
      organization: geo?.[0]?.organization ?? null,
    })),
    total,
  };
}

export async function getDashboardStats(): Promise<{
  totalIps: number;
  uniqueIpsToday: number;
  accessesToday: number;
  blockedIps: number;
  suspiciousIps: number;
  criticalEvents: number;
}> {
  const records = await recordsCollection();
  const events = await eventsCollection();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  const [totalIps, blockedIps, suspiciousIps, criticalEvents, accessesToday, uniqueTodayAgg] = await Promise.all([
    records.countDocuments({}),
    records.countDocuments({ risk_level: { $in: ["HIGH", "CRITICAL"] } }),
    records.countDocuments({ risk_level: "MEDIUM" }),
    events.countDocuments({ blocked: true, created_at: { $gte: startOfDayIso } }),
    events.countDocuments({ created_at: { $gte: startOfDayIso } }),
    events.distinct("ip", { created_at: { $gte: startOfDayIso } }),
  ]);

  return {
    totalIps,
    uniqueIpsToday: uniqueTodayAgg.length,
    accessesToday,
    blockedIps,
    suspiciousIps,
    criticalEvents,
  };
}

export async function getAccessesByHour(hours = 24): Promise<{ hour: string; count: number }[]> {
  const events = await eventsCollection();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const docs = await events
    .aggregate<{ _id: string; count: number }>([
      { $match: { created_at: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%dT%H:00", date: { $toDate: "$created_at" } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  return docs.map((d) => ({ hour: d._id, count: d.count }));
}

export async function getAccessesByDay(days = 14): Promise<{ day: string; count: number }[]> {
  const events = await eventsCollection();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const docs = await events
    .aggregate<{ _id: string; count: number }>([
      { $match: { created_at: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$created_at" } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  return docs.map((d) => ({ day: d._id, count: d.count }));
}

// Aplica a política de retenção configurável: remove eventos crus mais
// antigos que ATLAS_RASTREADOR_RETENTION_DAYS. Os registros agregados
// (ip_records) são mantidos — só o histórico bruto é descartado.
export async function applyRetentionPolicy(): Promise<{ deletedEvents: number; retentionDays: number }> {
  const retentionDays = Number(process.env.ATLAS_RASTREADOR_RETENTION_DAYS || 90);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const events = await eventsCollection();
  const result = await events.deleteMany({ created_at: { $lt: cutoff } });
  return { deletedEvents: result.deletedCount ?? 0, retentionDays };
}

