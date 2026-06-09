-- ============================================================
-- FDV — Migração 022: UNIQUE index em celular normalizado
-- ============================================================
-- Após a limpeza de duplicatas (cleanup-duplicatas.mjs),
-- adiciona um índice único na versão normalizada (só dígitos)
-- do campo celular para impedir futuras duplicatas no banco.
--
-- Por que índice funcional e não constraint na coluna?
-- O script de importação armazena celular como texto livre
-- (ex: "(11) 98888-7777"). Normalizar na query evita migrar
-- todos os valores existentes e mantém compatibilidade.
--
-- NULL é permitido — múltiplos leads sem celular são válidos.
-- Strings que viram '' após normalização também são excluídas.
-- ============================================================

create unique index if not exists leads_celular_normalized_unique
  on leads (regexp_replace(celular, '[^0-9]', '', 'g'))
  where celular is not null
    and regexp_replace(celular, '[^0-9]', '', 'g') <> '';
