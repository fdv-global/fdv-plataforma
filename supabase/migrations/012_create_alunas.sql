-- Migration 012: criação completa do módulo Alunas
-- (consolida antigas 011_alunas_module + 012_alunas_foto_grupo)

-- ─── alunas ───────────────────────────────────────────────────────────────────
create table if not exists alunas (
  id                 uuid        primary key default gen_random_uuid(),
  nome               text,
  email              text,
  celular            text,
  produto            text,
  status             text        not null default 'Nova compra',
  data_inscricao     date,
  data_termino       date,
  sessoes_total      int         not null default 0,
  sessoes_realizadas int         not null default 0,
  esta_no_grupo      boolean     not null default false,
  observacoes        text,
  foto_url           text,
  nome_grupo         text,
  lead_id            uuid        references leads(id) on delete set null,
  criadoem           timestamptz not null default now(),
  atualizadoem       timestamptz not null default now()
);

create index if not exists idx_alunas_lead_id   on alunas(lead_id);
create index if not exists idx_alunas_status    on alunas(status);
create index if not exists idx_alunas_produto   on alunas(produto);
create index if not exists idx_alunas_criadoem  on alunas(criadoem desc);

alter table alunas enable row level security;

create policy "authenticated full access" on alunas
  for all to authenticated using (true) with check (true);

create policy "anon full access" on alunas
  for all to anon using (true) with check (true);

-- ─── sessoes ──────────────────────────────────────────────────────────────────
create table if not exists sessoes (
  id            uuid        primary key default gen_random_uuid(),
  aluna_id      uuid        not null references alunas(id) on delete cascade,
  numero_sessao int,
  data          date,
  hora          time,
  status        text        not null default 'Aguardando',
  observacoes   text,
  criadoem      timestamptz not null default now()
);

create index if not exists idx_sessoes_aluna_id on sessoes(aluna_id);
create index if not exists idx_sessoes_data     on sessoes(data desc);
create index if not exists idx_sessoes_numero   on sessoes(aluna_id, numero_sessao);

alter table sessoes enable row level security;

create policy "authenticated full access" on sessoes
  for all to authenticated using (true) with check (true);

create policy "anon full access" on sessoes
  for all to anon using (true) with check (true);

-- ─── contratos ────────────────────────────────────────────────────────────────
create table if not exists contratos (
  id              uuid        primary key default gen_random_uuid(),
  aluna_id        uuid        not null references alunas(id) on delete cascade,
  produto         text,
  data_inicio     date,
  data_vencimento date,
  assinado        boolean     not null default false,
  esta_no_grupo   boolean     not null default false,
  observacoes     text,
  criadoem        timestamptz not null default now()
);

create index if not exists idx_contratos_aluna_id        on contratos(aluna_id);
create index if not exists idx_contratos_data_vencimento on contratos(data_vencimento);

alter table contratos enable row level security;

create policy "authenticated full access" on contratos
  for all to authenticated using (true) with check (true);

create policy "anon full access" on contratos
  for all to anon using (true) with check (true);

-- ─── bucket de fotos ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('alunas-fotos', 'alunas-fotos', true)
on conflict (id) do nothing;

create policy "Public read alunas-fotos"
  on storage.objects for select
  using (bucket_id = 'alunas-fotos');

create policy "Auth upload alunas-fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'alunas-fotos');

create policy "Auth delete alunas-fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'alunas-fotos');
