-- Migration 013: suporte à importação da planilha de alunas

-- Unique index em (nome, produto) para upsert idempotente via on_conflict
CREATE UNIQUE INDEX IF NOT EXISTS idx_alunas_nome_produto
  ON alunas(nome, produto);

-- Número ordinal da sessão para controle de ordem na importação
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS numero_sessao int;

-- Index auxiliar
CREATE INDEX IF NOT EXISTS idx_sessoes_numero ON sessoes(aluna_id, numero_sessao);
