-- Migration 010: tabela kanban_columns (persistência no banco) + aluna_id em leads

-- ─── kanban_columns ───────────────────────────────────────────────────────────
create table if not exists kanban_columns (
  id       uuid primary key default gen_random_uuid(),
  nome     text not null,
  ordem    int  not null default 0,
  cor      text,
  criadoem timestamptz not null default now()
);
alter table kanban_columns enable row level security;
create policy "authenticated full access" on kanban_columns
  for all to authenticated using (true) with check (true);

-- ─── aluna_id em leads ────────────────────────────────────────────────────────
alter table leads
  add column if not exists aluna_id uuid;
