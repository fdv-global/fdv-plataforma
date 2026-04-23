-- ============================================================
-- FDV — Sistema Operacional
-- Migração 001: Schema inicial (Firebase → Supabase)
-- ============================================================
-- Ordem de criação: usuarios → leads → lead_messages →
--   lead_historico → whatsapp_instances → notifications

-- ─── EXTENSÕES ───────────────────────────────────────────────
-- gen_random_uuid() já disponível no Supabase via pgcrypto
-- moddatetime para auto-atualizar updated_at
create extension if not exists moddatetime schema extensions;

-- ─── FUNÇÃO: atualiza atualizadoem automaticamente ───────────
create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  new.atualizadoem = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- TABELA: usuarios
-- Equivalente à coleção Firestore "usuarios"
-- Obs: o ID do Firebase era o uid do Auth — mantemos como
--      coluna firebase_uid para facilitar a migração do Auth.
-- ============================================================
create table if not exists usuarios (
  id           uuid primary key default gen_random_uuid(),
  firebase_uid text unique,                  -- uid do Firebase Auth (para migração)
  nome         text not null,
  email        text not null unique,
  role         text not null check (role in ('admin','closer','operador')),
  ativo        boolean not null default true,
  photo_url    text,
  criadoem     timestamptz not null default now(),
  atualizadoem timestamptz not null default now()
);

create trigger set_usuarios_updated_at
  before update on usuarios
  for each row execute function trigger_set_updated_at();

create index if not exists idx_usuarios_email        on usuarios (email);
create index if not exists idx_usuarios_firebase_uid on usuarios (firebase_uid);

-- ============================================================
-- TABELA: leads
-- Equivalente à coleção Firestore "leads"
-- Campos historico_kanban (array embedded) são migrados para
--   a tabela lead_historico abaixo.
-- ============================================================
create table if not exists leads (
  id                   uuid primary key default gen_random_uuid(),
  firebase_id          text unique,           -- doc ID original do Firestore

  -- Dados do lead
  nome                 text not null,
  celular              text,
  email                text,
  instagram            text,
  profissao            text,
  origem               text,                  -- Instagram, Indicação, Facebook, Google, WhatsApp, Outros
  renda                text,
  datachegada          date,

  -- Status pipeline
  status               text not null default 'aguardando',
                                              -- aguardando | agendado | realizada | noshow
  kanban_column        text,                  -- agendado | call_realizada | fechamento | followup | venda_ganha | venda_perdida
  kanban_column_since  timestamptz,

  -- Agendamento
  closer               text,                  -- chave: 'fernanda' | 'thomaz'
  agendadopor          text,
  dataagendamento      date,
  horaagendamento      time,

  -- Anotações
  observacoes          text,
  obs_call             text,
  resultado            text,
  status_closer        text,

  -- Etiquetas (array de strings: ['Super Lead','Bom',...])
  etiquetas            jsonb not null default '[]'::jsonb,

  -- Venda ganha (objeto: {valor, entrada, forma, programa, obs})
  venda_ganha_dados    jsonb,

  -- Motivo de perda
  motivo_perda         text,
  motivo_perda_label   text,
  motivo_perda_obs     text,

  -- WhatsApp (último contato)
  last_message_at      timestamptz,
  last_message_text    text,
  last_message_instance text,
  unread_count         integer not null default 0,

  -- Timestamps
  criadoem             timestamptz not null default now(),
  atualizadoem         timestamptz not null default now()
);

create trigger set_leads_updated_at
  before update on leads
  for each row execute function trigger_set_updated_at();

create index if not exists idx_leads_status         on leads (status);
create index if not exists idx_leads_kanban_column  on leads (kanban_column);
create index if not exists idx_leads_closer         on leads (closer);
create index if not exists idx_leads_datachegada    on leads (datachegada);
create index if not exists idx_leads_firebase_id    on leads (firebase_id);

-- ============================================================
-- TABELA: lead_messages
-- Equivalente à subcoleção Firestore "leads/{id}/messages"
-- ============================================================
create table if not exists lead_messages (
  id            uuid primary key default gen_random_uuid(),
  firebase_id   text,                         -- doc ID original

  lead_id       uuid not null references leads (id) on delete cascade,

  text          text not null,
  direction     text not null default 'sent'  -- sent | received
                check (direction in ('sent','received')),
  status        text not null default 'sent'  -- sent | delivered | read | failed
                check (status in ('sent','delivered','read','failed')),
  instance_name text,                         -- nome da instância WhatsApp usada
  sender_name   text,

  timestamp     timestamptz not null default now(),
  criadoem      timestamptz not null default now()
);

create index if not exists idx_lead_messages_lead_id   on lead_messages (lead_id);
create index if not exists idx_lead_messages_timestamp on lead_messages (timestamp);

-- ============================================================
-- TABELA: lead_historico
-- Equivalente ao campo embedded "historico_kanban" (array) do Firestore
-- (não era subcoleção — era array dentro do doc lead)
-- ============================================================
create table if not exists lead_historico (
  id          uuid primary key default gen_random_uuid(),

  lead_id     uuid not null references leads (id) on delete cascade,

  col         text not null,                  -- ID da coluna destino
  col_label   text,                           -- label legível
  movido_por  text,                           -- displayName ou email do usuário
  movido_em   timestamptz not null default now(),

  criadoem    timestamptz not null default now()
);

create index if not exists idx_lead_historico_lead_id  on lead_historico (lead_id);
create index if not exists idx_lead_historico_movido_em on lead_historico (movido_em);

-- ============================================================
-- TABELA: whatsapp_instances
-- Equivalente à coleção Firestore "whatsapp_instances"
-- ============================================================
create table if not exists whatsapp_instances (
  id            uuid primary key default gen_random_uuid(),
  firebase_id   text unique,

  instance_name text not null unique,
  display_name  text not null,
  responsavel   text,                         -- chave: 'fernanda' | 'thomaz' | etc.
  funil         text,
  phone_number  text,
  status        text not null default 'disconnected'
                check (status in ('connected','disconnected','awaiting_qr')),
  last_activity timestamptz,

  criadoem      timestamptz not null default now(),
  atualizadoem  timestamptz not null default now()
);

create trigger set_wa_instances_updated_at
  before update on whatsapp_instances
  for each row execute function trigger_set_updated_at();

create index if not exists idx_wa_instances_status on whatsapp_instances (status);

-- ============================================================
-- TABELA: notifications
-- Equivalente à subcoleção Firestore "notifications/{uid}/items"
-- No Firebase era agrupada por uid — aqui vira tabela plana
-- com coluna usuario_id.
-- ============================================================
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  firebase_id text,

  usuario_id  uuid references usuarios (id) on delete cascade,
                                              -- null = broadcast para todos
  message     text not null,
  read        boolean not null default false,

  created_at  timestamptz not null default now(),
  criadoem    timestamptz not null default now()  -- alias para consistência com resto do schema
);

create index if not exists idx_notifications_usuario_id on notifications (usuario_id);
create index if not exists idx_notifications_read       on notifications (usuario_id, read);
create index if not exists idx_notifications_created_at on notifications (created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- Ativado nas tabelas — políticas a ajustar conforme Auth do
-- Supabase for configurado. Por ora: acesso autenticado total.
-- ============================================================
alter table usuarios            enable row level security;
alter table leads               enable row level security;
alter table lead_messages       enable row level security;
alter table lead_historico      enable row level security;
alter table whatsapp_instances  enable row level security;
alter table notifications       enable row level security;

-- Política temporária: qualquer usuário autenticado lê e escreve tudo
-- (substituir por políticas por role após migrar o Auth)
create policy "authenticated full access" on usuarios
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on leads
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on lead_messages
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on lead_historico
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on whatsapp_instances
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on notifications
  for all to authenticated using (true) with check (true);
