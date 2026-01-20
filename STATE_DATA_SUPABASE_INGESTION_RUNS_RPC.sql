-- Authenticated-only RPC to view ingestion run history
create or replace function public.rpc_ingestion_runs_recent(p_limit int default 30)
returns table(
  started_at timestamptz,
  finished_at timestamptz,
  status text,
  year_be int,
  month_num int,
  month_th text,
  bucket text,
  object_path text,
  row_count int,
  error_message text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.started_at,
    r.finished_at,
    r.status,
    r.year_be,
    r.month_num,
    r.month_th,
    r.bucket,
    r.object_path,
    r.row_count,
    r.error_message
  from public.ingestion_runs r
  order by r.started_at desc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.rpc_ingestion_runs_recent(int) to authenticated;

