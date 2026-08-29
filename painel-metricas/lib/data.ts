import { getDb } from "./db";
import type { ParsedRow } from "./csv";
import type { MetricsTotals } from "./metrics";
import { nanoid } from "nanoid";

export type Client = {
  id: string;
  slug: string;
  name: string;
  business_label: string;
  logo_url: string | null;
  target_cost_per_conversation: number | null;
  created_at: string;
};

type ClientDoc = Omit<Client, "id"> & { _id: string };

function toClient(doc: ClientDoc): Client {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

async function clientsCollection() {
  const db = await getDb();
  return db.collection<ClientDoc>("clients");
}

export async function listClients(): Promise<Client[]> {
  const col = await clientsCollection();
  const docs = await col.find({}).sort({ name: 1 }).toArray();
  return docs.map(toClient);
}

export async function getClient(id: string): Promise<Client | null> {
  const col = await clientsCollection();
  const doc = await col.findOne({ _id: id });
  return doc ? toClient(doc) : null;
}

export async function getClientsByIds(ids: string[]): Promise<Client[]> {
  if (ids.length === 0) return [];
  const col = await clientsCollection();
  const docs = await col
    .find({ _id: { $in: ids } })
    .sort({ name: 1 })
    .toArray();
  return docs.map(toClient);
}

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createClient(input: {
  name: string;
  businessLabel: string;
  logoUrl?: string | null;
  targetCostPerConversation?: number | null;
}): Promise<Client> {
  const col = await clientsCollection();
  let slug = slugify(input.name);
  const existing = await col.findOne({ slug });
  if (existing) slug = `${slug}-${nanoid(4).toLowerCase()}`;

  const doc: ClientDoc = {
    _id: nanoid(),
    slug,
    name: input.name,
    business_label: input.businessLabel,
    logo_url: input.logoUrl ?? null,
    target_cost_per_conversation: input.targetCostPerConversation ?? null,
    created_at: new Date().toISOString(),
  };
  await col.insertOne(doc);
  return toClient(doc);
}

export type DailyRow = {
  date_start: string;
  date_end: string;
  spend: number;
  impressions: number;
  reach: number;
  link_clicks: number;
  conversations: number;
};

type DailyMetricDoc = DailyRow & {
  _id: string;
  client_id: string;
  created_at: string;
  updated_at: string;
};

async function dailyMetricsCollection() {
  const db = await getDb();
  return db.collection<DailyMetricDoc>("daily_metrics");
}

export async function upsertDailyMetrics(clientId: string, rows: ParsedRow[]) {
  if (rows.length === 0) return { inserted: 0, updated: 0 };

  const col = await dailyMetricsCollection();
  let inserted = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    const filter = { client_id: clientId, date_start: row.dateStart, date_end: row.dateEnd };
    const existing = await col.findOne(filter, { projection: { _id: 1 } });
    await col.updateOne(
      filter,
      {
        $set: {
          spend: row.spend,
          impressions: row.impressions,
          reach: row.reach,
          link_clicks: row.linkClicks,
          conversations: row.conversations,
          updated_at: now,
        },
        $setOnInsert: { _id: nanoid(), created_at: now },
      },
      { upsert: true }
    );
    if (existing) updated++;
    else inserted++;
  }

  return { inserted, updated };
}

// Registros diários (date_start = date_end) dentro do intervalo, mais
// registros consolidados cujo período inteiro cabe dentro do intervalo
// selecionado (não é possível fatiar um CSV consolidado por dia).
export async function getMetricsInRange(clientId: string, start: string, end: string): Promise<DailyRow[]> {
  const col = await dailyMetricsCollection();
  const docs = await col
    .find(
      { client_id: clientId, date_start: { $gte: start }, date_end: { $lte: end } },
      { projection: { date_start: 1, date_end: 1, spend: 1, impressions: 1, reach: 1, link_clicks: 1, conversations: 1 } }
    )
    .sort({ date_start: 1 })
    .toArray();
  return docs.map(({ date_start, date_end, spend, impressions, reach, link_clicks, conversations }) => ({
    date_start,
    date_end,
    spend,
    impressions,
    reach,
    link_clicks,
    conversations,
  }));
}

export function sumRows(rows: DailyRow[], start: string, end: string): MetricsTotals {
  const totals = rows.reduce(
    (acc, r) => {
      acc.spend += Number(r.spend);
      acc.impressions += Number(r.impressions);
      acc.reach += Number(r.reach);
      acc.linkClicks += Number(r.link_clicks);
      acc.conversations += Number(r.conversations);
      return acc;
    },
    { spend: 0, impressions: 0, reach: 0, linkClicks: 0, conversations: 0 }
  );
  const days = Math.max(1, Math.round((+new Date(end) - +new Date(start)) / 86400000) + 1);
  return { ...totals, days };
}

export type SharedLink = {
  id: string;
  token: string;
  label: string | null;
  client_ids: string[];
  date_start: string;
  date_end: string;
  visible_sections: {
    kpis: boolean;
    indicators: boolean;
    chart: boolean;
    table: boolean;
    insights: boolean;
  };
  mode: "frozen" | "live";
  frozen_snapshot: unknown | null;
  created_at: string;
  revoked_at: string | null;
};

type SharedLinkDoc = Omit<SharedLink, "id"> & { _id: string };

function toSharedLink(doc: SharedLinkDoc): SharedLink {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

async function sharedLinksCollection() {
  const db = await getDb();
  return db.collection<SharedLinkDoc>("shared_links");
}

export async function listSharedLinks(): Promise<SharedLink[]> {
  const col = await sharedLinksCollection();
  const docs = await col.find({}).sort({ created_at: -1 }).toArray();
  return docs.map(toSharedLink);
}

export async function createSharedLink(input: {
  label?: string | null;
  clientIds: string[];
  dateStart: string;
  dateEnd: string;
  visibleSections: SharedLink["visible_sections"];
  mode: "frozen" | "live";
  frozenSnapshot?: unknown;
}): Promise<SharedLink> {
  const col = await sharedLinksCollection();
  const token = nanoid(10).replace(/[_-]/g, "").toLowerCase() || nanoid(10);

  const doc: SharedLinkDoc = {
    _id: nanoid(),
    token,
    label: input.label ?? null,
    client_ids: input.clientIds,
    date_start: input.dateStart,
    date_end: input.dateEnd,
    visible_sections: input.visibleSections,
    mode: input.mode,
    frozen_snapshot: input.frozenSnapshot ?? null,
    created_at: new Date().toISOString(),
    revoked_at: null,
  };
  await col.insertOne(doc);
  return toSharedLink(doc);
}

export async function getSharedLinkByToken(token: string): Promise<SharedLink | null> {
  const col = await sharedLinksCollection();
  const doc = await col.findOne({ token });
  return doc ? toSharedLink(doc) : null;
}

export async function revokeSharedLink(id: string) {
  const col = await sharedLinksCollection();
  await col.updateOne({ _id: id, revoked_at: null }, { $set: { revoked_at: new Date().toISOString() } });
}

export async function reactivateSharedLink(id: string) {
  const col = await sharedLinksCollection();
  await col.updateOne({ _id: id }, { $set: { revoked_at: null } });
}
