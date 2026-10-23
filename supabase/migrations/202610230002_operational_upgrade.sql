-- Incremental migration for existing workspaces that already ran 202610230001.
-- Safe to run multiple times (idempotent).
begin;

alter table public.ps_shifts
  add column if not exists is_extra boolean not null default false,
  add column if not exists fine_paid boolean not null default false;

create table if not exists public.ps_weekly_schedule (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.ps_agents(id) on delete cascade,
  day_name text not null check (day_name in ('Senin','Selasa','Rabu','Kamis','Jumat')),
  session text not null check (session in ('Pagi','Siang')),
  is_pj boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ps_weekly_once unique (agent_id, day_name, session)
);
create index if not exists ps_weekly_schedule_day_idx on public.ps_weekly_schedule(day_name, session);

create table if not exists public.ps_settings (
  id uuid primary key default '00000000-0000-4000-8000-000000000001'::uuid check (id = '00000000-0000-4000-8000-000000000001'::uuid),
  late_tolerance_minutes integer not null default 15 check (late_tolerance_minutes between 0 and 180),
  late_fine_amount integer not null default 5000 check (late_fine_amount >= 0),
  absent_fine_amount integer not null default 10000 check (absent_fine_amount >= 0),
  operational_hours jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['ps_weekly_schedule','ps_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'admin_only'
    ) then
      execute format('create policy admin_only on public.%I for all to authenticated using ((select public.ps_is_admin())) with check ((select public.ps_is_admin()))', t);
    end if;
    if not exists (
      select 1 from pg_trigger where tgname = 'prepare_update' and tgrelid = ('public.' || t)::regclass
    ) then
      execute format('create trigger prepare_update before update on public.%I for each row execute function public.ps_prepare_update()', t);
    end if;
    if not exists (
      select 1 from pg_trigger where tgname = 'record_audit' and tgrelid = ('public.' || t)::regclass
    ) then
      execute format('create trigger record_audit after insert or update or delete on public.%I for each row execute function public.ps_record_audit()', t);
    end if;
  end loop;
end; $$;

commit;
