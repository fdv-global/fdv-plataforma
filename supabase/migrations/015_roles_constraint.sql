-- Migration 015: atualizar check constraint de role para incluir novos perfis
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_role_check
  CHECK (role IN ('admin', 'ceo', 'cs_financeiro', 'comercial', 'closer', 'operacoes'));
