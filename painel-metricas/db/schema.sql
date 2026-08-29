-- Atlas Performance — Painel de Métricas
-- Schema principal. Executado por scripts/migrate.mjs.

create extension if not exists pgcrypto;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  business_label text not null default '',
  logo_url text,
  target_cost_per_conversation numeric(12,2),
  created_at timestamptz not null default now()
);

-- Um registro por cliente por dia (quando o CSV tem quebra diária),
-- ou um registro cobrindo um intervalo maior quando o CSV vem consolidado.
create table if not exists daily_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  date_start date not null,
  date_end date not null,
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  link_clicks bigint not null default 0,
  conversations bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, date_start, date_end)
);

create index if not exists daily_metrics_client_date_idx
  on daily_metrics (client_id, date_start, date_end);

create table if not exists shared_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  label text,
  client_ids uuid[] not null,
  date_start date not null,
  date_end date not null,
  visible_sections jsonb not null default '{"kpis":true,"indicators":true,"chart":true,"table":true,"insights":true}',
  mode text not null default 'live' check (mode in ('frozen', 'live')),
  frozen_snapshot jsonb,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists shared_links_token_idx on shared_links (token);
