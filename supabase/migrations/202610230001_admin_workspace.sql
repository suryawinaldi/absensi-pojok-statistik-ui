-- Additive schema: existing agen/absensi/jadwal_master/denda tables are untouched.
-- Run using a database owner in Supabase SQL Editor, after reviewing this file.
begin;

create table public.ps_admin (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create function public.ps_is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.ps_admin where user_id = auth.uid()); $$;
revoke all on function public.ps_is_admin() from public;
grant execute on function public.ps_is_admin() to authenticated;

create table public.ps_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  division text not null check (length(trim(division)) between 1 and 80),
  position text not null check (length(trim(position)) between 1 and 60),
  active boolean not null default true,
  period text not null default '2026 / 2027' check (length(trim(period)) between 1 and 40),
  photo_path text check (photo_path is null or photo_path like 'agents/%'),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ps_shifts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.ps_agents(id) on delete restrict,
  date date not null,
  session text not null check (session in ('Pagi','Siang')),
  is_pj boolean not null default false,
  is_extra boolean not null default false,
  fine_paid boolean not null default false,
  status text not null default 'Belum dicatat' check (status in ('Belum dicatat','Hadir','Izin','Sakit','Tidak hadir')),
  arrival_time time without time zone,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ps_shift_once unique (agent_id, date, session),
  constraint ps_arrival_matches_status check (
    (status = 'Hadir' and arrival_time is not null) or
    (status <> 'Hadir' and arrival_time is null)
  )
);
create index ps_shifts_date_idx on public.ps_shifts(date);

create table public.ps_weekly_schedule (
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
create index ps_weekly_schedule_day_idx on public.ps_weekly_schedule(day_name, session);

create table public.ps_settings (
  id uuid primary key default '00000000-0000-4000-8000-000000000001'::uuid check (id = '00000000-0000-4000-8000-000000000001'::uuid),
  late_tolerance_minutes integer not null default 15 check (late_tolerance_minutes between 0 and 180),
  late_fine_amount integer not null default 5000 check (late_fine_amount >= 0),
  absent_fine_amount integer not null default 10000 check (absent_fine_amount >= 0),
  operational_hours jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ps_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  publish_date date not null,
  publish_time time without time zone not null,
  timezone text not null default 'Asia/Jakarta' check (timezone = 'Asia/Jakarta'),
  format text not null check (format in ('Feed','Carousel','Reel','Story')),
  status text not null default 'Ide' check (status in ('Ide','Dikerjakan','Review','Disetujui','Dijadwalkan','Terbit')),
  agent_id uuid not null references public.ps_agents(id) on delete restrict,
  category text not null default '' check (length(category) <= 60),
  brief text not null default '' check (length(brief) <= 4000),
  caption text not null default '' check (length(caption) <= 2200),
  instagram_url text not null default '',
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 4),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ps_instagram_url check (instagram_url = '' or instagram_url ~ '^https://(www\.)?instagram\.com(/|$)'),
  constraint ps_published_requires_url check (status <> 'Terbit' or instagram_url <> '')
);
create index ps_posts_date_idx on public.ps_posts(publish_date);
create index ps_posts_agent_idx on public.ps_posts(agent_id);

create table public.ps_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  entity text not null,
  entity_id uuid not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  recorded_at timestamptz not null default now()
);

create function public.ps_prepare_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := old.created_at;
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end; $$;

create function public.ps_record_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.ps_audit_log(actor_id,entity,entity_id,action)
    values (coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      tg_table_name, case when tg_op = 'DELETE' then old.id else new.id end, tg_op);
  return null;
end; $$;
revoke all on function public.ps_record_audit() from public;
revoke all on function public.ps_prepare_update() from public;

do $$
declare t text;
begin
  foreach t in array array['ps_agents','ps_shifts','ps_weekly_schedule','ps_settings','ps_posts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy admin_only on public.%I for all to authenticated using ((select public.ps_is_admin())) with check ((select public.ps_is_admin()))', t);
    execute format('create trigger prepare_update before update on public.%I for each row execute function public.ps_prepare_update()', t);
    execute format('create trigger record_audit after insert or update or delete on public.%I for each row execute function public.ps_record_audit()', t);
  end loop;
end; $$;

alter table public.ps_admin enable row level security;
revoke all on public.ps_admin from anon, authenticated;
grant select on public.ps_admin to authenticated;
create policy read_own_admin on public.ps_admin for select to authenticated using (user_id = (select auth.uid()));

alter table public.ps_audit_log enable row level security;
revoke all on public.ps_audit_log from anon, authenticated;
grant select on public.ps_audit_log to authenticated;
create policy read_audit_admin on public.ps_audit_log for select to authenticated using ((select public.ps_is_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('pojok-media','pojok-media',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy ps_media_read on storage.objects for select to authenticated
  using (bucket_id = 'pojok-media' and (select public.ps_is_admin()));
create policy ps_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pojok-media' and (select public.ps_is_admin()) and (storage.foldername(name))[1] in ('agents','posts'));
create policy ps_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pojok-media' and (select public.ps_is_admin()));


-- A stable source-ID map makes the optional legacy agent import repeatable.
create table public.ps_legacy_agent_map (
  legacy_id text primary key,
  agent_id uuid not null unique references public.ps_agents(id) on delete restrict
);
alter table public.ps_legacy_agent_map enable row level security;
revoke all on public.ps_legacy_agent_map from anon, authenticated;
grant select, insert on public.ps_legacy_agent_map to authenticated;
create policy admin_import_map on public.ps_legacy_agent_map for all to authenticated
  using ((select public.ps_is_admin())) with check ((select public.ps_is_admin()));

create function public.ps_import_agents(records jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare entry jsonb; new_id uuid; imported integer := 0; skipped integer := 0;
begin
  if not public.ps_is_admin() then raise insufficient_privilege; end if;
  if records is null or jsonb_typeof(records) <> 'array' or jsonb_array_length(records) > 500 then
    raise check_violation using message = 'Import requires an array of at most 500 agents';
  end if;
  perform pg_advisory_xact_lock(736201);
  for entry in select value from jsonb_array_elements(records) loop
    if nullif(trim(entry->>'legacy_id'),'') is null or
       nullif(trim(entry->>'name'),'') is null or
       nullif(trim(entry->>'division'),'') is null then
      raise check_violation using message = 'Legacy ID, name, and division are required';
    end if;
    if exists (select 1 from public.ps_legacy_agent_map where legacy_id=entry->>'legacy_id') then
      skipped := skipped + 1;
      continue;
    end if;
    insert into public.ps_agents(name, division, position)
      values(trim(entry->>'name'), trim(entry->>'division'), coalesce(nullif(trim(entry->>'position'),''),'Anggota'))
      returning id into new_id;
    insert into public.ps_legacy_agent_map values(entry->>'legacy_id',new_id);
    imported := imported + 1;
  end loop;
  return jsonb_build_object('imported',imported,'skipped',skipped);
end; $$;
revoke all on function public.ps_import_agents(jsonb) from public;
grant execute on function public.ps_import_agents(jsonb) to authenticated;

commit;
