import { pool } from "./db";
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

export async function listClients(): Promise<Client[]> {
  const { rows } = await pool.query<Client>("select * from clients order by name asc");
  return rows;
}

export async function getClient(id: string): Promise<Client | null> {
  const { rows } = await pool.query<Client>("select * from clients where id = $1", [id]);
  return rows[0] ?? null;
}

export async function getClientsByIds(ids: string[]): Promise<Client[]> {
  if (ids.length === 0) return [];
  const { rows } = await pool.query<Client>("select * from clients where id = any($1::uuid[]) order by name asc", [
    ids,
  ]);
  return rows;
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
  let slug = slugify(input.name);
  const { rows: existing } = await pool.query("select 1 from clients where slug = $1", [slug]);
  if (existing.length > 0) slug = `${slug}-${nanoid(4).toLowerCase()}`;

  const { rows } = await pool.query<Client>(
    `insert into clients (slug, name, business_label, logo_url, target_cost_per_conversation)
     values ($1, $2, $3, $4, $5) returning *`,
    [slug, input.name, input.businessLabel, input.logoUrl ?? null, input.targetCostPerConversation ?? null]
  );
  return rows[0];
}

export async function upsertDailyMetrics(clientId: string, rows: ParsedRow[]) {
  if (rows.length === 0) return { inserted: 0, updated: 0 };

  const client = await pool.connect();
  let inserted = 0;
  let updated = 0;
  try {
    await client.query("begin");
    for (const row of rows) {
      const res = await client.query(
        `insert into daily_metrics (client_id, date_start, date_end, spend, impressions, reach, link_clicks, conversations)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (client_id, date_start, date_end)
         do update set
           spend = excluded.spend,
           impressions = excluded.impressions,
           reach = excluded.reach,
           link_clicks = excluded.link_clicks,
           conversations = excluded.conversations,
           updated_at = now()
         returning (xmax = 0) as inserted`,
        [clientId, row.dateStart, row.dateEnd, row.spend, row.impressions, row.reach, row.linkClicks, row.conversations]
      );
      if (res.rows[0]?.inserted) inserted++;
      else updated++;
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
  return { inserted, updated };
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

// Registros diários (date_start = date_end) dentro do intervalo, mais
// registros consolidados cujo período inteiro cabe dentro do intervalo
// selecionado (não é possível fatiar um CSV consolidado por dia).
export async function getMetricsInRange(clientId: string, start: string, end: string): Promise<DailyRow[]> {
  const { rows } = await pool.query<DailyRow>(
    `select date_start, date_end, spend, impressions, reach, link_clicks, conversations
     from daily_metrics
     where client_id = $1 and date_start >= $2 and date_end <= $3
     order by date_start asc`,
    [clientId, start, end]
  );
  return rows;
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

export async function listSharedLinks(): Promise<SharedLink[]> {
  const { rows } = await pool.query<SharedLink>("select * from shared_links order by created_at desc");
  return rows;
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
  const token = nanoid(10).replace(/[_-]/g, "").toLowerCase() || nanoid(10);
  const { rows } = await pool.query<SharedLink>(
    `insert into shared_links (token, label, client_ids, date_start, date_end, visible_sections, mode, frozen_snapshot)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
    [
      token,
      input.label ?? null,
      input.clientIds,
      input.dateStart,
      input.dateEnd,
      JSON.stringify(input.visibleSections),
      input.mode,
      input.frozenSnapshot ? JSON.stringify(input.frozenSnapshot) : null,
    ]
  );
  return rows[0];
}

export async function getSharedLinkByToken(token: string): Promise<SharedLink | null> {
  const { rows } = await pool.query<SharedLink>("select * from shared_links where token = $1", [token]);
  return rows[0] ?? null;
}

export async function revokeSharedLink(id: string) {
  await pool.query("update shared_links set revoked_at = now() where id = $1 and revoked_at is null", [id]);
}

export async function reactivateSharedLink(id: string) {
  await pool.query("update shared_links set revoked_at = null where id = $1", [id]);
}
