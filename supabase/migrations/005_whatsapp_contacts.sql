-- Migration 005: whatsapp_contacts — conversas de números desconhecidos (não-leads)

-- Contatos do WhatsApp que ainda não foram convertidos em leads
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

-- lead_messages pode agora ser linkada a um contact (não-lead) em vez de um lead
ALTER TABLE lead_messages ALTER COLUMN lead_id DROP NOT NULL;
ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE;

-- RLS
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_contacts_service_all" ON whatsapp_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);
