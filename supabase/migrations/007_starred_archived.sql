-- Migration 007: estrelar mensagens e arquivar conversas

-- Estrelar mensagens individuais
ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS starred BOOLEAN NOT NULL DEFAULT false;

-- Arquivar conversas
ALTER TABLE leads              ADD COLUMN IF NOT EXISTS chat_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE whatsapp_contacts  ADD COLUMN IF NOT EXISTS chat_archived BOOLEAN NOT NULL DEFAULT false;

-- Favoritar conversa (filtro rápido "Favoritas")
ALTER TABLE leads              ADD COLUMN IF NOT EXISTS chat_starred BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE whatsapp_contacts  ADD COLUMN IF NOT EXISTS chat_starred BOOLEAN NOT NULL DEFAULT false;
