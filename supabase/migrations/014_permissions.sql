-- Migration 014: sistema de permissões granular por usuário
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS permissions jsonb
  NOT NULL DEFAULT '{"inicio":true,"comercial":false,"alunas":false,"financeiro":false,"whatsapp_tati":false,"whatsapp_fernanda":false,"whatsapp_thomaz":false,"usuarios":false}';

-- Preencher retroativamente baseado no role existente
UPDATE usuarios
SET permissions = '{"inicio":true,"comercial":true,"alunas":true,"financeiro":true,"whatsapp_tati":true,"whatsapp_fernanda":true,"whatsapp_thomaz":true,"usuarios":true}'
WHERE role = 'admin'
  AND permissions = '{"inicio":true,"comercial":false,"alunas":false,"financeiro":false,"whatsapp_tati":false,"whatsapp_fernanda":false,"whatsapp_thomaz":false,"usuarios":false}';

UPDATE usuarios
SET permissions = '{"inicio":true,"comercial":true,"alunas":false,"financeiro":false,"whatsapp_tati":false,"whatsapp_fernanda":false,"whatsapp_thomaz":false,"usuarios":false}'
WHERE role IN ('closer', 'operacoes', 'comercial')
  AND permissions = '{"inicio":true,"comercial":false,"alunas":false,"financeiro":false,"whatsapp_tati":false,"whatsapp_fernanda":false,"whatsapp_thomaz":false,"usuarios":false}';
