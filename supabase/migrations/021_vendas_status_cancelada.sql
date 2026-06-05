-- Migration 021: Criar tabela vendas (inclui campos de 009 + status/atualizadoem)
-- Idempotente: cria a tabela se não existir; adiciona colunas se já existir sem elas.

create table if not exists vendas (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references leads(id) on delete set null,
  closer          text,
  programa        text,
  valor           text,
  valor_entrada   text,
  forma_pagamento text,
  observacoes     text,
  status          text not null default 'ativa',
  atualizadoem    timestamptz,
  criadoem        timestamptz not null default now()
);

-- Índices (IF NOT EXISTS é seguro)
create index if not exists idx_vendas_lead_id  on vendas(lead_id);
create index if not exists idx_vendas_criadoem on vendas(criadoem desc);
create index if not exists idx_vendas_closer   on vendas(closer);

-- RLS
alter table vendas enable row level security;

-- Política: cria só se não existir (caso 009 tenha sido parcialmente aplicada)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'vendas' and policyname = 'authenticated full access'
  ) then
    execute 'create policy "authenticated full access" on vendas
             for all to authenticated using (true) with check (true)';
  end if;
end $$;

-- Se a tabela já existia (009 aplicada), garante que as colunas novas existam
alter table vendas add column if not exists status       text not null default 'ativa';
alter table vendas add column if not exists atualizadoem timestamptz;
