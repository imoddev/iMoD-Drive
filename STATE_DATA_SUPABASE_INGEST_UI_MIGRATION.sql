-- Migration for enabling ingest via web Upload tab
-- Applies safe auth checks and grants EXECUTE to authenticated only.

create or replace function public.rpc_ingest_state_data(
  p_bucket text,
  p_object_path text,
  p_file_sha256 text,
  p_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_year_be int;
  v_month_th text;
  v_month_num int;
  v_time_id bigint;
  v_row_count int;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if p_bucket <> 'state-data' then
    raise exception 'invalid bucket';
  end if;
  if p_object_path is null or p_object_path not like 'raw/%' then
    raise exception 'invalid object path';
  end if;

  if p_file_sha256 is null or p_file_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid sha256';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a jsonb array';
  end if;

  select
    (p_rows->0->>'year_be')::int,
    (p_rows->0->>'month_th')::text
  into v_year_be, v_month_th;

  if v_year_be is null or v_month_th is null then
    raise exception 'first row must include year_be and month_th';
  end if;

  v_month_num := public.month_num_from_th(v_month_th);
  if v_month_num is null then
    raise exception 'unknown month_th: %', v_month_th;
  end if;

  with ins as (
    insert into public.ingestion_runs (bucket, object_path, file_sha256, status, year_be, month_th, month_num)
    values (p_bucket, p_object_path, p_file_sha256, 'running', v_year_be, v_month_th, v_month_num)
    on conflict (file_sha256) do nothing
    returning id
  )
  select id into v_run_id
  from (
    select id from ins
    union all
    select id from public.ingestion_runs where file_sha256 = p_file_sha256
  ) s
  limit 1;

  select status into v_status from public.ingestion_runs where id = v_run_id;
  if v_status = 'succeeded' then
    return v_run_id;
  end if;

  delete from public.fact_registrations where run_id = v_run_id;

  insert into public.dim_time (year_be, month_num, month_th)
  values (v_year_be, v_month_num, v_month_th)
  on conflict (year_be, month_num) do update set month_th = excluded.month_th;

  select id into v_time_id from public.dim_time where year_be = v_year_be and month_num = v_month_num;

  with data as (
    select
      nullif(btrim(vehicle_type), '') as vehicle_type,
      nullif(btrim(brand), '') as brand,
      coalesce(nullif(btrim(model), ''), '(ไม่ระบุรุ่น)') as model,
      greatest(coalesce(count, 0), 0) as count
    from jsonb_to_recordset(p_rows) as x(
      year_be int,
      month_th text,
      vehicle_type text,
      brand text,
      model text,
      count int
    )
  )
  insert into public.dim_vehicle_type (type_name)
  select distinct vehicle_type
  from data
  where vehicle_type is not null
  on conflict (type_name) do nothing;

  with data as (
    select nullif(btrim(brand), '') as brand
    from jsonb_to_recordset(p_rows) as x(
      year_be int,
      month_th text,
      vehicle_type text,
      brand text,
      model text,
      count int
    )
  )
  insert into public.dim_brand (brand_name)
  select distinct brand
  from data
  where brand is not null
  on conflict (brand_name) do nothing;

  with data as (
    select
      nullif(btrim(brand), '') as brand,
      coalesce(nullif(btrim(model), ''), '(ไม่ระบุรุ่น)') as model
    from jsonb_to_recordset(p_rows) as x(
      year_be int,
      month_th text,
      vehicle_type text,
      brand text,
      model text,
      count int
    )
  ), pairs as (
    select distinct b.id as brand_id, d.model as model_name
    from data d
    join public.dim_brand b on b.brand_name = d.brand
  )
  insert into public.dim_model (brand_id, model_name)
  select brand_id, model_name
  from pairs
  on conflict (brand_id, model_name) do nothing;

  with data as (
    select
      nullif(btrim(vehicle_type), '') as vehicle_type,
      nullif(btrim(brand), '') as brand,
      coalesce(nullif(btrim(model), ''), '(ไม่ระบุรุ่น)') as model,
      greatest(coalesce(count, 0), 0) as count
    from jsonb_to_recordset(p_rows) as x(
      year_be int,
      month_th text,
      vehicle_type text,
      brand text,
      model text,
      count int
    )
  ), agg as (
    select vehicle_type, brand, model, sum(count)::int as total
    from data
    where vehicle_type is not null and brand is not null
    group by vehicle_type, brand, model
  )
  insert into public.fact_registrations (run_id, time_id, type_id, brand_id, model_id, count)
  select
    v_run_id,
    v_time_id,
    vt.id,
    b.id,
    m.id,
    a.total
  from agg a
  join public.dim_vehicle_type vt on vt.type_name = a.vehicle_type
  join public.dim_brand b on b.brand_name = a.brand
  join public.dim_model m on m.brand_id = b.id and m.model_name = a.model
  on conflict (run_id, time_id, type_id, brand_id, model_id) do update set count = excluded.count;

  select jsonb_array_length(p_rows) into v_row_count;

  update public.ingestion_runs
  set status = 'succeeded', row_count = v_row_count, finished_at = now(), error_message = null
  where id = v_run_id;

  return v_run_id;
exception when others then
  if v_run_id is not null then
    update public.ingestion_runs
    set status = 'failed', error_message = sqlerrm, finished_at = now()
    where id = v_run_id;
  end if;
  raise;
end;
$$;

revoke all on function public.rpc_ingest_state_data(text,text,text,jsonb) from public;
grant execute on function public.rpc_ingest_state_data(text,text,text,jsonb) to authenticated;

