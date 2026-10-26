begin;

create table public.ps_online_roster (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('Instagram','OA LINE')),
  weekday integer not null check (weekday between 0 and 6),
  valid_from date not null,
  valid_until date,
  exception_date date,
  starts_at time not null,
  ends_at time not null check (ends_at > starts_at),
  agent_id uuid references public.ps_agents(id) on delete restrict,
  reason text not null default '' check (length(reason) <= 1000),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from),
  check (exception_date is null or (exception_date = valid_from and valid_until = exception_date and weekday = extract(dow from exception_date)::integer)),
  check (agent_id is not null or exception_date is not null),
  check (exception_date is null or length(trim(reason)) > 0)
);
create index ps_online_roster_lookup on public.ps_online_roster(channel,weekday,valid_from,valid_until);
create index ps_online_roster_agent on public.ps_online_roster(agent_id);

create table public.ps_online_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  line_id text unique check (line_id is null or length(trim(line_id)) between 1 and 120),
  first_contact_at timestamptz not null,
  summary text not null default '' check (length(summary) <= 4000),
  owner_id uuid references public.ps_agents(id) on delete restrict,
  assignment_source text not null default 'unassigned' check (assignment_source in ('roster','manual','unassigned')),
  transfer_reason text not null default '' check (length(transfer_reason) <= 1000),
  status text not null default 'Baru' check (status in ('Baru','Dalam penanganan','Menunggu klien','Selesai')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ps_online_clients_owner on public.ps_online_clients(owner_id,status);
create table public.ps_online_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.ps_online_clients(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 4000),
  occurred_at timestamptz not null,
  actor_id uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index ps_online_notes_client on public.ps_online_notes(client_id,occurred_at);
create table public.ps_online_events (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_id uuid not null,
  old_owner uuid,
  new_owner uuid,
  detail jsonb not null,
  actor_id uuid not null,
  created_at timestamptz not null default now()
);
create index ps_online_events_entity on public.ps_online_events(entity_id,created_at);

create function public.ps_online_agent_eligible(agent uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
 select exists(select 1 from public.ps_agents where id=agent and active and division='Pelayanan dan Konsultasi');
$$;
revoke all on function public.ps_online_agent_eligible(uuid) from public, anon, authenticated;
grant execute on function public.ps_online_agent_eligible(uuid) to authenticated;

create function public.ps_online_resolve(channel_name text, contact_at timestamptz) returns uuid
language sql stable security invoker set search_path = '' as $$
 with chosen as (
   select r.* from public.ps_online_roster r
   where r.channel=channel_name
     and r.weekday=extract(dow from contact_at at time zone 'Asia/Jakarta')::integer
     and r.valid_from <= (contact_at at time zone 'Asia/Jakarta')::date
     and (r.valid_until is null or r.valid_until >= (contact_at at time zone 'Asia/Jakarta')::date)
     and (r.exception_date is null or r.exception_date=(contact_at at time zone 'Asia/Jakarta')::date)
   order by (r.exception_date is not null) desc limit 1
 )
 select agent_id from chosen
 where public.ps_online_agent_eligible(agent_id)
   and (contact_at at time zone 'Asia/Jakarta')::time >= starts_at
   and (contact_at at time zone 'Asia/Jakarta')::time < ends_at;
$$;
revoke all on function public.ps_online_resolve(text,timestamptz) from public, anon, authenticated;
grant execute on function public.ps_online_resolve(text,timestamptz) to authenticated;

create function public.ps_validate_online_roster() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  -- Serialize overlapping roster writes. The single admin may use multiple devices.
  perform pg_advisory_xact_lock(9472601);
  if new.agent_id is not null and not public.ps_online_agent_eligible(new.agent_id) then
    raise exception 'Petugas wajib agen aktif Pelayanan dan Konsultasi.' using errcode='23514';
  end if;
  if tg_op='UPDATE' then
    if row(new.channel,new.weekday,new.valid_from,new.exception_date,new.starts_at,new.ends_at,new.agent_id)
      is distinct from row(old.channel,old.weekday,old.valid_from,old.exception_date,old.starts_at,old.ends_at,old.agent_id) then
      raise exception 'Jadwal tersimpan tidak ditimpa. Akhiri masa berlaku, lalu buat jadwal baru.' using errcode='23514';
    end if;
    if new.valid_until is null or new.valid_until < (now() at time zone 'Asia/Jakarta')::date
       or (old.valid_until is not null and new.valid_until > old.valid_until) then
      raise exception 'Tanggal akhir hanya dapat dipersingkat mulai hari ini.' using errcode='23514';
    end if;
  end if;
  if exists(select 1 from public.ps_online_roster r where r.id<>new.id and r.channel=new.channel
    and r.weekday=new.weekday
    and (r.exception_date is null)=(new.exception_date is null)
    and daterange(r.valid_from,r.valid_until,'[]') && daterange(new.valid_from,new.valid_until,'[]')) then
    raise exception 'Jadwal kanal dan hari ini bertabrakan. Akhiri jadwal lama terlebih dahulu.' using errcode='23514';
  end if;
  return new;
end; $$;
revoke all on function public.ps_validate_online_roster() from public, anon, authenticated;
create trigger validate_online_roster before insert or update on public.ps_online_roster
for each row execute function public.ps_validate_online_roster();

create function public.ps_validate_online_client() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare proposed uuid;
begin
  new.line_id := nullif(trim(new.line_id),'');
  if tg_op='INSERT' then
    proposed := public.ps_online_resolve('OA LINE',new.first_contact_at);
    if new.owner_id is null and proposed is not null then new.owner_id:=proposed; end if;
    if new.owner_id is null then new.assignment_source:='unassigned';
    elsif new.owner_id=proposed then new.assignment_source:='roster';
    else
      if length(trim(new.transfer_reason))=0 then
        raise exception 'Alasan penetapan PJ manual wajib diisi.' using errcode='23514';
      end if;
      new.assignment_source:='manual';
    end if;
  else
    if new.first_contact_at is distinct from old.first_contact_at then
      raise exception 'Waktu kontak pertama tidak dapat ditimpa.' using errcode='23514';
    end if;
    new.assignment_source:=old.assignment_source;
    if new.owner_id is distinct from old.owner_id then
      if new.owner_id is null or length(trim(new.transfer_reason))=0 then
        raise exception 'Alih PJ membutuhkan petugas baru dan alasan.' using errcode='23514';
      end if;
      new.assignment_source:='manual';
    end if;
  end if;
  if new.owner_id is not null and (tg_op='INSERT' or new.owner_id is distinct from old.owner_id) then
    if not public.ps_online_agent_eligible(new.owner_id) then
      raise exception 'PJ wajib agen aktif Pelayanan dan Konsultasi.' using errcode='23514';
    end if;
  end if;
  return new;
end; $$;
revoke all on function public.ps_validate_online_client() from public, anon, authenticated;
create trigger validate_online_client before insert or update on public.ps_online_clients
for each row execute function public.ps_validate_online_client();

-- Append-only history is written by a trigger, never by the browser.
create function public.ps_record_online_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.ps_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  insert into public.ps_online_events(entity,entity_id,old_owner,new_owner,detail,actor_id)
  values(tg_table_name,new.id,
    case when tg_op='UPDATE' then (to_jsonb(old)->>'owner_id')::uuid else null end,
    (to_jsonb(new)->>'owner_id')::uuid,
    jsonb_build_object('action',tg_op,'before',case when tg_op='UPDATE' then to_jsonb(old) else null end,'after',to_jsonb(new)),auth.uid());
  return null;
end; $$;
revoke all on function public.ps_record_online_event() from public, anon, authenticated;

-- Freeze the planned publisher at first publication. Old publications remain unknown.
alter table public.ps_posts add column online_publisher_id uuid references public.ps_agents(id) on delete restrict;
create function public.ps_capture_online_publisher() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op='UPDATE' and (old.status='Terbit' or old.online_publisher_id is not null) then
    new.online_publisher_id:=old.online_publisher_id;
  elsif new.status='Terbit' then
    new.online_publisher_id:=public.ps_online_resolve('Instagram',(new.publish_date+new.publish_time) at time zone 'Asia/Jakarta');
  else new.online_publisher_id:=null;
  end if;
  return new;
end; $$;
revoke all on function public.ps_capture_online_publisher() from public, anon, authenticated;
create trigger capture_online_publisher before insert or update on public.ps_posts
for each row execute function public.ps_capture_online_publisher();

do $$ declare t text; begin
  foreach t in array array['ps_online_roster','ps_online_clients','ps_online_notes','ps_online_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy admin_read on public.%I for select to authenticated using ((select public.ps_is_admin()))',t);
    if t<>'ps_online_events' then
      execute format('grant insert on public.%I to authenticated',t);
      execute format('create policy admin_insert on public.%I for insert to authenticated with check ((select public.ps_is_admin()))',t);
    end if;
    if t in ('ps_online_roster','ps_online_clients') then
      execute format('grant update on public.%I to authenticated',t);
      execute format('create policy admin_update on public.%I for update to authenticated using ((select public.ps_is_admin())) with check ((select public.ps_is_admin()))',t);
      execute format('create trigger prepare_update before update on public.%I for each row execute function public.ps_prepare_update()',t);
      execute format('create trigger record_online_event after insert or update on public.%I for each row execute function public.ps_record_online_event()',t);
    end if;
  end loop;
end; $$;
create policy notes_actor on public.ps_online_notes as restrictive for insert to authenticated
with check (actor_id=auth.uid());
commit;
