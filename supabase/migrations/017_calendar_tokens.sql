-- ============================================================
-- FDV — Migração 017: Tokens OAuth do Google Calendar
-- Armazena access/refresh token por closer para integração
-- automática de data/hora ao confirmar agendamentos.
-- ============================================================

create table if not exists calendar_tokens (
  closer_key    text primary key,           -- 'fernanda' | 'thomaz'
  google_email  text,
  access_token  text,
  refresh_token text not null,
  token_expiry  timestamptz,
  criadoem      timestamptz not null default now(),
  atualizadoem  timestamptz not null default now()
);

create trigger set_calendar_tokens_updated_at
  before update on calendar_tokens
  for each row execute function trigger_set_updated_at();
