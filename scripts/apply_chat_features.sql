-- ============================================================
-- Chat Features Migration
-- Apply in Supabase SQL Editor
-- ============================================================

-- Feature 1: media support
ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS media_url  TEXT;
ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS media_name TEXT;

-- Feature 3: reply-to
ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS reply_to_text   TEXT;
ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS reply_to_sender TEXT;

-- Feature 6: pin
ALTER TABLE leads             ADD COLUMN IF NOT EXISTS chat_pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE whatsapp_contacts ADD COLUMN IF NOT EXISTS chat_pinned BOOLEAN NOT NULL DEFAULT FALSE;
