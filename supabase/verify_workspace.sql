-- Read-only verification for Supabase SQL Editor (run as database owner).
-- Returns metadata and counts only; never passwords, tokens, or agent records.

-- All workspace tables must exist and have RLS enabled.
with expected(name) as (
  values ('ps_admin'),('ps_agents'),('ps_shifts'),('ps_posts'),
         ('ps_audit_log'),('ps_legacy_agent_map')
)
select e.name as table_name,
       c.oid is not null as exists,
       coalesce(c.relrowsecurity,false) as rls_enabled
from expected e
left join pg_namespace n on n.nspname='public'
left join pg_class c on c.relnamespace=n.oid and c.relname=e.name and c.relkind='r'
order by e.name;

-- Review policy expressions: application tables should allow the registered admin only.
select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies
where (schemaname='public' and tablename in
  ('ps_admin','ps_agents','ps_shifts','ps_posts','ps_audit_log','ps_legacy_agent_map'))
  or (schemaname='storage' and tablename='objects' and policyname like 'ps_media_%')
order by schemaname,tablename,policyname;

-- Review grants. Anonymous users must have no privileges on workspace tables.
select table_name,grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in
  ('ps_admin','ps_agents','ps_shifts','ps_posts','ps_audit_log','ps_legacy_agent_map')
  and grantee in ('anon','authenticated','PUBLIC')
order by table_name,grantee,privilege_type;

-- Functions: ps_is_admin/ps_record_audit use SECURITY DEFINER and a fixed search_path.
select p.proname,p.prosecdef as security_definer,p.proconfig as settings,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
  ('ps_is_admin','ps_prepare_update','ps_record_audit','ps_import_agents')
order by p.proname;

-- There should be a prepare_update and record_audit trigger on each data table.
select c.relname as table_name,t.tgname,pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('ps_agents','ps_shifts','ps_posts')
  and not t.tgisinternal
order by c.relname,t.tgname;

-- Verify uniqueness, foreign keys, presence of arrival time, and publication constraints.
select c.relname as table_name,k.conname,k.contype,pg_get_constraintdef(k.oid) as definition
from pg_constraint k join pg_class c on c.oid=k.conrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
  ('ps_admin','ps_agents','ps_shifts','ps_posts','ps_legacy_agent_map')
order by c.relname,k.conname;

-- Expected: public=false, 5242880 bytes, JPEG/PNG/WebP.
select id,public,file_size_limit,allowed_mime_types
from storage.buckets where id='pojok-media';

-- Check account registration without returning an email or credential.
do $$
declare registrations bigint; valid_users bigint; confirmed bigint;
begin
  if to_regclass('public.ps_admin') is null then
    raise notice 'Admin verification: ps_admin is missing; workspace migration is required.';
    return;
  end if;
  execute 'select count(*), count(u.id), count(u.email_confirmed_at)
    from public.ps_admin a left join auth.users u on u.id=a.user_id'
    into registrations,valid_users,confirmed;
  raise notice 'Admin verification: registrations=%, valid_auth_users=%, confirmed_email_users=% (expected 1,1,1)',
    registrations,valid_users,confirmed;
end $$;
