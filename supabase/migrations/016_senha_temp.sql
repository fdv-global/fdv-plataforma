-- Migration 016: campo para senha temporária (limpo automaticamente no primeiro login)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_temp text;
