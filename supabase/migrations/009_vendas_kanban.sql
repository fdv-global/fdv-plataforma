-- Migration 009: Módulo Closer/Kanban redesign
-- Tabela vendas, historico embedded, kanban_columns por usuário

-- ─── historico_kanban no lead (embedded, sincronizado com lead_historico) ───
alter table leads
  add column if not exists historico_kanban jsonb default '[]'::jsonb;

-- ─── Campos de descarte no kanban (reutiliza os de agendamentos se já existirem) ───
alter table leads
  add column if not exists motivo_descarte       text,
  add column if not exists motivo_descarte_label text,
  add column if not exists motivo_descarte_obs   text;

-- ─── Tabela de vendas fechadas ────────────────────────────────────────────────
create table if not exists vendas (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references leads(id) on delete set null,
  closer          text,
  programa        text,
  valor           text,
  valor_entrada   text,
  forma_pagamento text,
  observacoes     text,
  criadoem        timestamptz not null default now()
);

create index if not exists idx_vendas_lead_id  on vendas(lead_id);
create index if not exists idx_vendas_criadoem on vendas(criadoem desc);
create index if not exists idx_vendas_closer   on vendas(closer);

alter table vendas enable row level security;
create policy "authenticated full access" on vendas
  for all to authenticated using (true) with check (true);

-- ─── Configuração de colunas do kanban por usuário ───────────────────────────
alter table usuarios
  add column if not exists kanban_columns jsonb;

-- ─── Atualizar comentário do kanban_column ───────────────────────────────────
comment on column leads.kanban_column is
  'agendado | call_realizada | negociacao | decisao | venda_ganha | descartado | [custom]';
