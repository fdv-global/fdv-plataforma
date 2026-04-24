-- ============================================================
-- FDV — Migração 003: Políticas RLS para role anon
-- ============================================================
-- Contexto: o app.js usa o anon key do Supabase com Firebase Auth
-- para autenticação. As políticas existentes só cobrem o role
-- "authenticated" (Supabase Auth), bloqueando silenciosamente
-- todas as queries do app. Esta migration adiciona políticas
-- equivalentes para o role "anon".
-- ============================================================

-- leads
create policy "anon full access" on leads
  for all to anon using (true) with check (true);

-- lead_historico
create policy "anon full access" on lead_historico
  for all to anon using (true) with check (true);

-- lead_messages
create policy "anon full access" on lead_messages
  for all to anon using (true) with check (true);

-- usuarios
create policy "anon full access" on usuarios
  for all to anon using (true) with check (true);

-- whatsapp_instances
create policy "anon full access" on whatsapp_instances
  for all to anon using (true) with check (true);

-- notifications
create policy "anon full access" on notifications
  for all to anon using (true) with check (true);
