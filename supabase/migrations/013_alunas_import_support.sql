-- Migration 013: unique index em alunas(nome, produto) para importação idempotente
CREATE UNIQUE INDEX IF NOT EXISTS idx_alunas_nome_produto
  ON alunas(nome, produto);
