-- Public RPCs for iMoD Drive stats site
-- Purpose: Allow a public web app to read aggregated stats without exposing base tables.

-- Lock down base tables (enable RLS). Do not add SELECT policies for anon.
alter table if exists public.ingestion_runs enable row level security;
alter table if exists public.dim_time enable row level security;
alter table if exists public.dim_vehicle_type enable row level security;
alter table if exists public.dim_brand enable row level security;
alter table if exists public.dim_model enable row level security;
alter table if exists public.fact_registrations enable row level security;
alter table if exists public.dim_country enable row level security;
alter table if exists public.brand_profile enable row level security;
alter table if exists public.model_profile enable row level security;
alter table if exists public.external_sources enable row level security;
alter table if exists public.external_runs enable row level security;
alter table if exists public.external_items enable row level security;
alter table if exists public.external_metrics enable row level security;

-- Latest succeeded run per month
create or replace view public.vw_latest_run_per_time as
select distinct on (t.id)
  t.id as time_id,
  r.id as run_id
from public.dim_time t
join public.ingestion_runs r
  on r.year_be = t.year_be
 and r.month_num = t.month_num
where r.status = 'succeeded'
order by t.id, r.finished_at desc nulls last, r.started_at desc;

-- Thai month mapping helper (optional)
create or replace function public.month_num_from_th(month_th text)
returns int
language sql
immutable
as $$
  select case trim(month_th)
    when 'มกราคม' then 1
    when 'กุมภาพันธ์' then 2
    when 'มีนาคม' then 3
    when 'เมษายน' then 4
    when 'พฤษภาคม' then 5
    when 'มิถุนายน' then 6
    when 'กรกฎาคม' then 7
    when 'สิงหาคม' then 8
    when 'กันยายน' then 9
    when 'ตุลาคม' then 10
    when 'พฤศจิกายน' then 11
    when 'ธันวาคม' then 12
    else null
  end;
$$;

-- Available years (from succeeded runs)
create or replace function public.rpc_available_years()
returns table(year_be int)
language sql
stable
security definer
set search_path = public
as $$
  select distinct year_be
  from public.ingestion_runs
  where status = 'succeeded' and year_be is not null
  order by year_be;
$$;

-- Latest month for a year
create or replace function public.rpc_latest_month(p_year_be int)
returns table(month_num int, month_th text)
language sql
stable
security definer
set search_path = public
as $$
  select t.month_num, t.month_th
  from public.vw_latest_run_per_time l
  join public.dim_time t on t.id = l.time_id
  where t.year_be = p_year_be
  order by t.month_num desc
  limit 1;
$$;

-- Monthly totals for a year
create or replace function public.rpc_monthly_totals(p_year_be int)
returns table(month_num int, month_th text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.month_num,
    coalesce(t.month_th, t.month_num::text) as month_th,
    sum(f.count)::bigint as total
  from public.vw_latest_run_per_time l
  join public.dim_time t on t.id = l.time_id
  join public.fact_registrations f
    on f.run_id = l.run_id
   and f.time_id = t.id
  where t.year_be = p_year_be
  group by t.month_num, t.month_th
  order by t.month_num;
$$;

-- Vehicle type share for selected month
create or replace function public.rpc_vehicle_type_share(p_year_be int, p_month_num int)
returns table(type_name text, total bigint, share_pct numeric)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select l.run_id, t.id as time_id
    from public.vw_latest_run_per_time l
    join public.dim_time t on t.id = l.time_id
    where t.year_be = p_year_be and t.month_num = p_month_num
  ), agg as (
    select vt.type_name, sum(f.count)::bigint as total
    from base b
    join public.fact_registrations f on f.run_id = b.run_id and f.time_id = b.time_id
    join public.dim_vehicle_type vt on vt.id = f.type_id
    group by vt.type_name
  ), tot as (
    select sum(total)::numeric as grand_total from agg
  )
  select a.type_name, a.total,
    case when tot.grand_total is null or tot.grand_total = 0 then 0
         else round((a.total::numeric / tot.grand_total) * 100, 2)
    end as share_pct
  from agg a cross join tot
  order by a.total desc;
$$;

-- Top brands for a year (optionally filter powertrain)
create or replace function public.rpc_top_brands(p_year_be int, p_limit int default 10, p_powertrain text default null)
returns table(brand_name text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.brand_name,
    sum(f.count)::bigint as total
  from public.vw_latest_run_per_time l
  join public.dim_time t on t.id = l.time_id
  join public.fact_registrations f on f.run_id = l.run_id and f.time_id = t.id
  join public.dim_brand b on b.id = f.brand_id
  left join public.model_profile mp on mp.model_id = f.model_id
  where t.year_be = p_year_be
    and (p_powertrain is null or mp.powertrain = p_powertrain)
  group by b.brand_name
  order by total desc
  limit greatest(p_limit, 0);
$$;

-- Top models for a year (optionally filter powertrain)
create or replace function public.rpc_top_models(p_year_be int, p_limit int default 10, p_powertrain text default null)
returns table(brand_name text, model_name text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.brand_name,
    m.model_name,
    sum(f.count)::bigint as total
  from public.vw_latest_run_per_time l
  join public.dim_time t on t.id = l.time_id
  join public.fact_registrations f on f.run_id = l.run_id and f.time_id = t.id
  join public.dim_brand b on b.id = f.brand_id
  join public.dim_model m on m.id = f.model_id
  left join public.model_profile mp on mp.model_id = f.model_id
  where t.year_be = p_year_be
    and (p_powertrain is null or mp.powertrain = p_powertrain)
  group by b.brand_name, m.model_name
  order by total desc
  limit greatest(p_limit, 0);
$$;

-- Explore (drilldown) with optional filters
create or replace function public.rpc_explore(
  p_year_be int,
  p_month_num int default null,
  p_type text default null,
  p_brand text default null,
  p_powertrain text default null,
  p_limit int default 200,
  p_offset int default 0
)
returns table(
  year_be int,
  month_num int,
  month_th text,
  type_name text,
  brand_name text,
  model_name text,
  powertrain text,
  total bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select l.run_id, t.id as time_id, t.year_be, t.month_num, t.month_th
    from public.vw_latest_run_per_time l
    join public.dim_time t on t.id = l.time_id
    where t.year_be = p_year_be
      and (p_month_num is null or t.month_num = p_month_num)
  )
  select
    b.year_be,
    b.month_num,
    b.month_th,
    vt.type_name,
    br.brand_name,
    mo.model_name,
    mp.powertrain,
    sum(f.count)::bigint as total
  from base b
  join public.fact_registrations f on f.run_id = b.run_id and f.time_id = b.time_id
  join public.dim_vehicle_type vt on vt.id = f.type_id
  join public.dim_brand br on br.id = f.brand_id
  join public.dim_model mo on mo.id = f.model_id
  left join public.model_profile mp on mp.model_id = f.model_id
  where (p_type is null or vt.type_name = p_type)
    and (p_brand is null or br.brand_name = p_brand)
    and (p_powertrain is null or mp.powertrain = p_powertrain)
  group by b.year_be, b.month_num, b.month_th, vt.type_name, br.brand_name, mo.model_name, mp.powertrain
  order by total desc
  limit greatest(p_limit, 0)
  offset greatest(p_offset, 0);
$$;

-- Allow public execution
grant execute on function public.rpc_available_years() to anon, authenticated;
grant execute on function public.rpc_latest_month(int) to anon, authenticated;
grant execute on function public.rpc_monthly_totals(int) to anon, authenticated;
grant execute on function public.rpc_vehicle_type_share(int,int) to anon, authenticated;
grant execute on function public.rpc_top_brands(int,int,text) to anon, authenticated;
grant execute on function public.rpc_top_models(int,int,text) to anon, authenticated;
grant execute on function public.rpc_explore(int,int,text,text,text,int,int) to anon, authenticated;

