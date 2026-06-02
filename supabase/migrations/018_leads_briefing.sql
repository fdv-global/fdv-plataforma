-- Migration 018: adiciona coluna briefing na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS briefing text;
