-- Schema for State Data Supabase project (tables for ingestion, dimensions, events, external sources)
create extension if not exists pgcrypto;

-- Ingestion run log
create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  object_path text not null,
  file_sha256 text not null unique,
  year_be int,
  month_th text,
  month_num int,
  status text not null default 'running' check (status in ('running','succeeded','failed','superseded')),
  row_count int,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Dimension tables
create table if not exists public.dim_time (
  id bigserial primary key,
  year_be int not null,
  month_num int not null check (month_num between 1 and 12),
  month_th text,
  unique (year_be, month_num)
);

create table if not exists public.dim_vehicle_type (
  id bigserial primary key,
  type_name text not null unique
);

create table if not exists public.dim_brand (
  id bigserial primary key,
  brand_name text not null unique
);

create table if not exists public.dim_model (
  id bigserial primary key,
  brand_id bigint not null references public.dim_brand(id),
  model_name text not null,
  unique (brand_id, model_name)
);

-- Fact table
create table if not exists public.fact_registrations (
  id bigserial primary key,
  run_id uuid not null references public.ingestion_runs(id) on delete cascade,
  time_id bigint not null references public.dim_time(id),
  type_id bigint not null references public.dim_vehicle_type(id),
  brand_id bigint not null references public.dim_brand(id),
  model_id bigint not null references public.dim_model(id),
  count int not null check (count >= 0),
  unique (run_id, time_id, type_id, brand_id, model_id)
);

create index if not exists idx_fact_time on public.fact_registrations(time_id);
create index if not exists idx_fact_type on public.fact_registrations(type_id);
create index if not exists idx_fact_brand on public.fact_registrations(brand_id);
create index if not exists idx_fact_model on public.fact_registrations(model_id);

-- Enrichment tables for brand/model metadata
create table if not exists public.dim_country (
  id bigserial primary key,
  country_code text not null unique,
  country_name text not null
);

create table if not exists public.brand_profile (
  brand_id bigint primary key references public.dim_brand(id),
  origin_country_id bigint references public.dim_country(id),
  notes text
);

create table if not exists public.model_profile (
  model_id bigint primary key references public.dim_model(id),
  powertrain text,
  segment text,
  body_type text,
  price_range text,
  notes text
);

-- External data ingestion
create table if not exists public.external_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_name text not null,
  source_type text not null check (source_type in ('manual','api','rss')),
  base_url text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.external_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.external_sources(id),
  status text not null default 'running' check (status in ('running','succeeded','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  cursor_in text,
  cursor_out text,
  raw_bucket text,
  raw_object_path text,
  record_count int,
  error_message text
);

create index if not exists idx_external_runs_source on public.external_runs(source_id, started_at desc);

create table if not exists public.external_items (
  id bigserial primary key,
  source_run_id uuid not null references public.external_runs(id) on delete cascade,
  source_id uuid not null references public.external_sources(id),
  external_uid text not null,
  title text,
  url text,
  published_at timestamptz,
  payload jsonb not null,
  unique (source_id, external_uid)
);

create table if not exists public.external_metrics (
  id bigserial primary key,
  source_run_id uuid not null references public.external_runs(id) on delete cascade,
  source_id uuid not null references public.external_sources(id),
  metric_key text not null,
  measured_at timestamptz not null,
  value_numeric numeric,
  value_text text,
  dimensions jsonb not null default '{}'::jsonb,
  unique (source_id, metric_key, measured_at, dimensions)
);

create index if not exists idx_external_metrics_key_time on public.external_metrics(metric_key, measured_at desc);
