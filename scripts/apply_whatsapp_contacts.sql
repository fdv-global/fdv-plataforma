-- ============================================================
-- Aplicar no Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Colar e executar
-- ============================================================
-- Cria a tabela whatsapp_contacts e adapta lead_messages para
-- suportar conversas de números ainda não convertidos em leads.
-- Seguro de rodar múltiplas vezes (idempotente).
-- ============================================================

-- 1. Tabela whatsapp_contacts
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             TEXT NOT NULL,
  push_name         TEXT,
  instance_name     TEXT,
  unread_count      INT NOT NULL DEFAULT 0,
  last_message_at   TIMESTAMPTZ,
  last_message_text TEXT,
  criadoem          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tornar lead_id opcional em lead_messages
--    (permite mensagens ligadas a um contato em vez de um lead)
DO $$
BEGIN
  ALTER TABLE lead_messages ALTER COLUMN lead_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Adicionar contact_id em lead_messages
ALTER TABLE lead_messages
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE;

-- 4. RLS
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;

-- 5. Políticas (drop+create para ser idempotente)
DROP POLICY IF EXISTS "wa_contacts_service_all"      ON whatsapp_contacts;
DROP POLICY IF EXISTS "wa_contacts_anon_all"         ON whatsapp_contacts;
DROP POLICY IF EXISTS "wa_contacts_authenticated_all" ON whatsapp_contacts;
DROP POLICY IF EXISTS "anon full access"             ON whatsapp_contacts;
DROP POLICY IF EXISTS "authenticated full access"    ON whatsapp_contacts;

CREATE POLICY "wa_contacts_service_all"      ON whatsapp_contacts FOR ALL TO service_role   USING (true) WITH CHECK (true);
CREATE POLICY "wa_contacts_anon_all"         ON whatsapp_contacts FOR ALL TO anon            USING (true) WITH CHECK (true);
CREATE POLICY "wa_contacts_authenticated_all" ON whatsapp_contacts FOR ALL TO authenticated  USING (true) WITH CHECK (true);
