-- Upload history logs (for web UI)
create table if not exists public.upload_logs (
  id bigserial primary key,
  user_id uuid not null,
  user_email text,
  bucket text not null,
  object_path text not null,
  original_filename text,
  byte_size bigint,
  status text not null default 'uploaded' check (status in ('uploaded','failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_upload_logs_created_at on public.upload_logs(created_at desc);
create index if not exists idx_upload_logs_user_id on public.upload_logs(user_id, created_at desc);

alter table public.upload_logs enable row level security;

drop policy if exists "upload-logs insert own" on public.upload_logs;
create policy "upload-logs insert own"
on public.upload_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "upload-logs read all authenticated" on public.upload_logs;
create policy "upload-logs read all authenticated"
on public.upload_logs
for select
to authenticated
using (true);

