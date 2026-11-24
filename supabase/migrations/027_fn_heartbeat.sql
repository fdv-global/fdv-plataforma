-- 027_fn_heartbeat.sql
-- Tabela de heartbeat das Edge Functions. Já existia no banco (aplicada fora do repo);
-- este arquivo reproduz o estado de produção de forma idempotente.

begin;

create table if not exists public.fn_heartbeat (
  function_name   text        not null primary key,
  last_seen_at    timestamptz not null default now(),
  payload_summary jsonb,
  updated_at      timestamptz not null default now()
);

alter table public.fn_heartbeat enable row level security;

drop policy if exists "anon_read_heartbeat" on public.fn_heartbeat;
create policy "anon_read_heartbeat" on public.fn_heartbeat
  for select to anon, authenticated
  using (true);

drop policy if exists "service_role_write_heartbeat" on public.fn_heartbeat;
create policy "service_role_write_heartbeat" on public.fn_heartbeat
  for all to service_role
  using (true) with check (true);

commit;
