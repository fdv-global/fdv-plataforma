-- ============================================================
-- FDV — Migração 023: campo slug em kanban_columns
-- ============================================================
-- A tabela kanban_columns (migration 010) usa id uuid como PK,
-- mas leads.kanban_column armazena slugs de texto ('agendado',
-- 'call_realizada', etc.). Esta migração adiciona o campo slug
-- que serve de ponte entre as duas, sem alterar dados de leads.
--
-- Após aplicar: o JS lê slug como identificador de coluna e
-- nome como label de exibição, tornando renomear seguro.
-- ============================================================

alter table kanban_columns
  add column if not exists slug text unique;

-- Semente das 4 colunas padrão (on conflict = já existem)
insert into kanban_columns (slug, nome, ordem) values
  ('agendado',       'Agendado',       0),
  ('call_realizada', 'Call Realizada', 1),
  ('negociacao',     'Negociação',     2),
  ('decisao',        'Decisão',        3)
on conflict (slug) do nothing;
