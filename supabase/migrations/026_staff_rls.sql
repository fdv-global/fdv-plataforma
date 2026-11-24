-- 026_staff_rls.sql — Plataforma FDV (yadxcbhginjvoemacdly)
-- Fecha o acesso da chave pública (anon) às tabelas de alunas e troca
-- "qualquer authenticated acessa tudo" por "funcionário ativo em usuarios".
-- Pré-requisito da virada para Firebase Third-Party Auth (front sem service_role).
-- Sem impacto no CRM atual: o front usa service_role, que ignora RLS.

begin;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from usuarios u
  where u.firebase_uid = (auth.jwt() ->> 'sub')
    and u.ativo
  limit 1
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_staff_role() is not null
$$;

create or replace function public.is_admin_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() = 'admin', false)
$$;

revoke all on function public.current_staff_role() from public;
revoke all on function public.is_staff() from public;
revoke all on function public.is_admin_staff() from public;
grant execute on function public.current_staff_role(), public.is_staff(), public.is_admin_staff() to authenticated;

-- 1. Chave pública: sem acesso a dados pessoais
drop policy if exists "anon full access"      on alunas;
drop policy if exists "anon full access"      on contratos;
drop policy if exists "anon full access"      on sessoes;
drop policy if exists "wa_contacts_anon_all"  on whatsapp_contacts;

-- 2. Authenticated: só funcionário ativo
drop policy if exists "authenticated full access"                  on alunas;
drop policy if exists "authenticated full access"                  on contratos;
drop policy if exists "authenticated full access"                  on sessoes;
drop policy if exists "authenticated full access"                  on kanban_columns;
drop policy if exists "authenticated full access"                  on lead_historico;
drop policy if exists "authenticated full access"                  on lead_messages;
drop policy if exists "authenticated full access"                  on leads;
drop policy if exists "authenticated full access"                  on notifications;
drop policy if exists "authenticated full access"                  on usuarios;
drop policy if exists "authenticated full access"                  on vendas;
drop policy if exists "authenticated full access"                  on whatsapp_instances;
drop policy if exists "wa_contacts_authenticated_all"              on whatsapp_contacts;
drop policy if exists "autenticados podem inserir comentários"     on lead_comentarios;
drop policy if exists "autenticados podem ver todos os comentários" on lead_comentarios;

do $$
declare t text;
begin
  foreach t in array array[
    'alunas','contratos','sessoes','kanban_columns','lead_historico','lead_messages',
    'leads','notifications','vendas','whatsapp_instances','whatsapp_contacts',
    'lead_comentarios','labels','lead_labels','quick_replies','app_settings','calendar_tokens'
  ] loop
    execute format('drop policy if exists "staff_all" on %I', t);
    execute format(
      'create policy "staff_all" on %I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

-- 3. usuarios: todos os funcionários leem; só admin escreve (evita autopromoção via role/permissions)
drop policy if exists "staff_read"       on usuarios;
drop policy if exists "admin_manage"     on usuarios;
create policy "staff_read"   on usuarios for select to authenticated using (public.is_staff());
create policy "admin_manage" on usuarios for all to authenticated
  using (public.is_admin_staff()) with check (public.is_admin_staff());

commit;
