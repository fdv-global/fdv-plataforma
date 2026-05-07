-- Migration 008: campos de descarte no pipeline de Agendamentos
-- Adiciona status 'qualificado' e 'descartado' ao pipeline pré-call,
-- e os campos de motivo de descarte separados dos de venda perdida.

alter table leads
  add column if not exists motivo_descarte       text,
  add column if not exists motivo_descarte_label text,
  add column if not exists motivo_descarte_obs   text;

comment on column leads.status is
  'aguardando | qualificado | agendado | realizada | noshow | cancelado | descartado';
