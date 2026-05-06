-- Migration 006: habilitar Supabase Realtime para tabelas do chat
-- Sem isso, os canais postgres_changes nunca disparam no cliente.

-- Adicionar à publicação realtime
alter publication supabase_realtime add table lead_messages;
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table whatsapp_contacts;

-- REPLICA IDENTITY FULL obrigatório para filtros em postgres_changes
-- (sem isso, o Supabase não entrega o valor antigo e filtros podem falhar)
alter table lead_messages     replica identity full;
alter table leads              replica identity full;
alter table whatsapp_contacts  replica identity full;

-- Política anon para whatsapp_contacts
-- A migration 005 só criou acesso para service_role; o app.js usa anon key
-- e não conseguia ler nem atualizar a tabela.
drop policy if exists "wa_contacts_anon_all" on whatsapp_contacts;
create policy "wa_contacts_anon_all" on whatsapp_contacts
  for all to anon using (true) with check (true);
