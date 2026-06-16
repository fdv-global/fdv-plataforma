-- migration: 024_leads_followup_contato.sql

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS contato_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultimo_contato_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status_followup TEXT DEFAULT 'sem_contato';

-- Garantir que todos os leads qualificados existentes
-- começam como 'sem_contato'
UPDATE leads
SET status_followup = 'sem_contato'
WHERE status = 'qualificado'
AND status_followup IS NULL;

-- Índice para performance nas queries de qualificados
CREATE INDEX IF NOT EXISTS idx_leads_status_followup
ON leads(status_followup)
WHERE status = 'qualificado';
