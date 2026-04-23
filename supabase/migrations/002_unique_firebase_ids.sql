-- ============================================================
-- FDV — Migração 002: Constraints UNIQUE em firebase_id
-- Necessário para upsert idempotente no script de migração
-- ============================================================

-- lead_messages: adiciona unique em firebase_id para upsert
alter table lead_messages
  add constraint lead_messages_firebase_id_unique unique (firebase_id);

-- notifications: adiciona unique em firebase_id para upsert
alter table notifications
  add constraint notifications_firebase_id_unique unique (firebase_id);
