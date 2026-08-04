-- Migration 025: Adiciona data_venda (data real da venda, editável) à tabela vendas.
-- Corrige o uso de criadoem (timestamp de criação do registro) como proxy da data
-- da venda — uma venda de julho lançada em agosto entrava como se fosse de agosto.

alter table vendas add column if not exists data_venda date;

-- Backfill: registros existentes assumem a data de criação como melhor estimativa disponível.
update vendas set data_venda = criadoem::date where data_venda is null;

alter table vendas alter column data_venda set default current_date;
alter table vendas alter column data_venda set not null;
