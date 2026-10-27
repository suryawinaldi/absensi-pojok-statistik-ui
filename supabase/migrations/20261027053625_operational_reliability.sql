begin;
-- Retain legacy configuration, limit every API operation to the registered admin.
do $$ begin
 if to_regclass('public.pengaturan_sistem') is not null then
  alter table public.pengaturan_sistem enable row level security;
  revoke all on public.pengaturan_sistem from public,anon,authenticated;
  grant select,insert,update,delete on public.pengaturan_sistem to authenticated;
  create policy workspace_admin_gate on public.pengaturan_sistem as restrictive for all to authenticated
    using ((select public.ps_is_admin())) with check ((select public.ps_is_admin()));
  create policy workspace_admin_access on public.pengaturan_sistem for all to authenticated
    using ((select public.ps_is_admin())) with check ((select public.ps_is_admin()));
 end if;
end $$;
revoke all on function public.ps_is_admin() from public,anon;
grant execute on function public.ps_is_admin() to authenticated;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like 'ps_%' and p.prorettype='trigger'::regtype loop
  execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 end loop;
end $$;

alter table public.ps_online_roster add column cancelled_at timestamptz,
 add column cancellation_reason text not null default '' check(length(cancellation_reason)<=1000);
create or replace function public.ps_validate_online_roster() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(9472601);
 if tg_op='UPDATE' then
  if old.cancelled_at is not null then raise exception 'Jadwal yang dibatalkan tidak dapat ditimpa.' using errcode='23514'; end if;
  if new.cancelled_at is not null then
   if length(trim(new.cancellation_reason))=0 then raise exception 'Alasan koreksi/pembatalan wajib diisi.' using errcode='23514'; end if;
   if (to_jsonb(new)-array['cancelled_at','cancellation_reason','version','updated_at']) is distinct from
      (to_jsonb(old)-array['cancelled_at','cancellation_reason','version','updated_at']) then
    raise exception 'Pembatalan tidak boleh menimpa isi jadwal.' using errcode='23514';
   end if;
   new.cancelled_at:=now(); return new;
  end if;
  if row(new.channel,new.weekday,new.valid_from,new.exception_date,new.starts_at,new.ends_at,new.agent_id)
   is distinct from row(old.channel,old.weekday,old.valid_from,old.exception_date,old.starts_at,old.ends_at,old.agent_id) then
   raise exception 'Gunakan koreksi jadwal agar riwayat tersimpan.' using errcode='23514'; end if;
  if new.valid_until is null or new.valid_until<(now() at time zone 'Asia/Jakarta')::date
   or (old.valid_until is not null and new.valid_until>old.valid_until) then
   raise exception 'Tanggal akhir hanya dapat dipersingkat mulai hari ini.' using errcode='23514'; end if;
 else
  new.cancelled_at:=null; new.cancellation_reason:='';
 end if;
 if new.agent_id is not null and not public.ps_online_agent_eligible(new.agent_id) then
  raise exception 'Petugas wajib agen aktif Pelayanan dan Konsultasi.' using errcode='23514'; end if;
 if exists(select 1 from public.ps_online_roster r where r.id<>new.id and r.cancelled_at is null
  and r.channel=new.channel and r.weekday=new.weekday and (r.exception_date is null)=(new.exception_date is null)
  and daterange(r.valid_from,r.valid_until,'[]') && daterange(new.valid_from,new.valid_until,'[]')) then
  raise exception 'Jadwal kanal dan hari ini bertabrakan.' using errcode='23514'; end if;
 return new;
end $$;
create or replace function public.ps_online_resolve(channel_name text,contact_at timestamptz) returns uuid
language sql stable security invoker set search_path='' as $$
 with chosen as (
 select r.* from public.ps_online_roster r where r.cancelled_at is null and r.channel=channel_name
 and r.weekday=extract(dow from contact_at at time zone 'Asia/Jakarta')::integer
 and r.valid_from<=(contact_at at time zone 'Asia/Jakarta')::date
 and (r.valid_until is null or r.valid_until>=(contact_at at time zone 'Asia/Jakarta')::date)
 and (r.exception_date is null or r.exception_date=(contact_at at time zone 'Asia/Jakarta')::date)
 order by (r.exception_date is not null) desc limit 1)
 select agent_id from chosen where public.ps_online_agent_eligible(agent_id)
 and (contact_at at time zone 'Asia/Jakarta')::time>=starts_at
 and (contact_at at time zone 'Asia/Jakarta')::time<ends_at;
$$;
create function public.ps_correct_online_roster(row_id uuid,expected_version integer,reason text,replacement jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare old_row public.ps_online_roster%rowtype; new_id uuid;
begin
 if not public.ps_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(9472601);
 select * into old_row from public.ps_online_roster where id=row_id for update;
 if not found or old_row.version<>expected_version or old_row.cancelled_at is not null then
  raise exception 'Jadwal berubah. Muat ulang sebelum koreksi.' using errcode='40001'; end if;
 if length(trim(reason)) not between 1 and 1000 then raise exception 'Alasan wajib diisi.' using errcode='23514'; end if;
 update public.ps_online_roster set cancelled_at=now(),cancellation_reason=$3 where id=row_id;
 if replacement is not null then
  insert into public.ps_online_roster(channel,weekday,valid_from,valid_until,exception_date,starts_at,ends_at,agent_id,reason)
  values(replacement->>'channel',(replacement->>'weekday')::integer,(replacement->>'valid_from')::date,
   (replacement->>'valid_until')::date,(replacement->>'exception_date')::date,
   (replacement->>'starts_at')::time,(replacement->>'ends_at')::time,(replacement->>'agent_id')::uuid,reason)
  returning id into new_id;
 end if;
 return coalesce(new_id,row_id);
end $$;
revoke all on function public.ps_correct_online_roster(uuid,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.ps_correct_online_roster(uuid,integer,text,jsonb) to authenticated;

create function public.ps_shift_fine_amount(s public.ps_shifts) returns bigint
language plpgsql stable security invoker set search_path='' as $$
declare cfg public.ps_settings%rowtype; rules jsonb; sess jsonb; day_name text; start_time time;
begin
 if s.is_extra or s.status in ('Izin','Sakit','Belum dicatat') then return 0; end if;
 select * into cfg from public.ps_settings limit 1;
 rules:=s.rules_snapshot;
 if s.status='Tidak hadir' then return coalesce((rules->>'absentFineAmount')::bigint,cfg.absent_fine_amount,10000); end if;
 if s.is_pj then return 0; end if;
 day_name:=(array['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'])[extract(dow from s.date)::integer+1];
 sess:=coalesce(rules->'session',cfg.operational_hours->day_name->s.session,'{}'::jsonb);
 start_time:=coalesce((sess->>'start')::time,case when s.session='Pagi' then time '10:00' else time '13:30' end);
 if s.status='Hadir' and s.arrival_time>start_time+make_interval(mins=>coalesce((rules->>'lateToleranceMinutes')::integer,cfg.late_tolerance_minutes,15)) then
  return coalesce((rules->>'lateFineAmount')::bigint,cfg.late_fine_amount,5000);
 end if;
 return 0;
end $$;
revoke all on function public.ps_shift_fine_amount(public.ps_shifts) from public,anon,authenticated;

create table public.ps_fine_payments (
 id uuid primary key default gen_random_uuid(),
 shift_id uuid not null references public.ps_shifts(id) on delete restrict,
 event_type text not null check(event_type in ('payment','reversal')),
 amount bigint not null check(amount>=0),
 reverses uuid unique references public.ps_fine_payments(id) on delete restrict,
 paid_at timestamptz,
 received_by text not null check(length(trim(received_by)) between 1 and 120),
 note text not null default '' check(length(note)<=1000),
 origin text not null default 'admin' check(origin in ('admin','legacy_baseline')),
 recorded_by uuid,
 recorded_at timestamptz not null default now(),
 check((event_type='payment' and reverses is null) or (event_type='reversal' and reverses is not null and length(trim(note))>0)),
 check(origin='legacy_baseline' or (paid_at is not null and recorded_by is not null))
);
create index ps_fine_payments_shift_idx on public.ps_fine_payments(shift_id,recorded_at);
create index ps_fine_payments_actor_idx on public.ps_fine_payments(recorded_by);
insert into public.ps_fine_payments(shift_id,event_type,amount,received_by,note,origin)
 select s.id,'payment',public.ps_shift_fine_amount(s),'Tidak tercatat (data lama)',
 'Baseline dari penanda lunas lama; nominal diinferensikan dari aturan tersimpan. Waktu dan penerima asli belum tercatat.','legacy_baseline'
 from public.ps_shifts s where s.fine_paid;
alter table public.ps_fine_payments enable row level security;
revoke all on public.ps_fine_payments from public,anon,authenticated;
grant select on public.ps_fine_payments to authenticated;
create policy admin_read on public.ps_fine_payments for select to authenticated using((select public.ps_is_admin()));

create function public.ps_guard_fine_paid() returns trigger
language plpgsql security definer set search_path='' as $$
declare paid boolean;
begin
 if tg_op='INSERT' and not new.fine_paid then return new; end if;
 if tg_op='UPDATE' and new.fine_paid=old.fine_paid then return new; end if;
 select exists(select 1 from public.ps_fine_payments p where p.shift_id=new.id and p.event_type='payment'
  and not exists(select 1 from public.ps_fine_payments r where r.reverses=p.id)) into paid;
 if new.fine_paid is distinct from paid then raise exception 'Gunakan transaksi pembayaran/pembatalan untuk mengubah status lunas.' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function public.ps_guard_fine_paid() from public,anon,authenticated;
create trigger guard_fine_paid before insert or update on public.ps_shifts for each row execute function public.ps_guard_fine_paid();

create function public.ps_record_fine_payment(shift_id uuid,expected_version integer,request_id uuid,payment_time timestamptz,receiver text,note_text text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.ps_shifts%rowtype; existing public.ps_fine_payments%rowtype; amount_due bigint;
begin
 if not public.ps_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 select * into s from public.ps_shifts where id=shift_id for update;
 if not found then raise exception 'Catatan tidak ditemukan.' using errcode='23514'; end if;
 select * into existing from public.ps_fine_payments where id=request_id;
 if found then
  if existing.shift_id<>shift_id or existing.event_type<>'payment' then raise exception 'ID transaksi tidak sesuai.' using errcode='23514'; end if;
  return existing.id;
 end if;
 if s.version<>expected_version then raise exception 'Catatan berubah. Muat ulang.' using errcode='40001'; end if;
 if s.fine_paid then raise exception 'Denda sudah lunas.' using errcode='23514'; end if;
 amount_due:=public.ps_shift_fine_amount(s);
 if amount_due<=0 then raise exception 'Tidak ada denda yang perlu dibayar.' using errcode='23514'; end if;
 if payment_time is null or payment_time>now()+interval '5 minutes' then raise exception 'Waktu pembayaran tidak valid.' using errcode='23514'; end if;
 insert into public.ps_fine_payments(id,shift_id,event_type,amount,paid_at,received_by,note,recorded_by)
 values(request_id,s.id,'payment',amount_due,payment_time,trim(receiver),trim(note_text),auth.uid());
 update public.ps_shifts set fine_paid=true where id=s.id;
 return request_id;
end $$;
create function public.ps_reverse_fine_payment(shift_id uuid,expected_version integer,request_id uuid,reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.ps_shifts%rowtype; p public.ps_fine_payments%rowtype; existing public.ps_fine_payments%rowtype;
begin
 if not public.ps_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 select * into s from public.ps_shifts where id=shift_id for update;
 if not found then raise exception 'Catatan tidak ditemukan.' using errcode='23514'; end if;
 select * into existing from public.ps_fine_payments where id=request_id;
 if found then
  if existing.shift_id<>shift_id or existing.event_type<>'reversal' then raise exception 'ID transaksi tidak sesuai.' using errcode='23514'; end if;
  return existing.id;
 end if;
 if s.version<>expected_version then raise exception 'Catatan berubah. Muat ulang.' using errcode='40001'; end if;
 if length(trim(reason)) not between 1 and 1000 then raise exception 'Alasan pembatalan wajib diisi.' using errcode='23514'; end if;
 select * into p from public.ps_fine_payments x where x.shift_id=s.id and x.event_type='payment'
  and not exists(select 1 from public.ps_fine_payments r where r.reverses=x.id) order by recorded_at desc limit 1;
 if not found or not s.fine_paid then raise exception 'Tidak ada pembayaran aktif.' using errcode='23514'; end if;
 insert into public.ps_fine_payments(id,shift_id,event_type,amount,reverses,paid_at,received_by,note,recorded_by)
 values(request_id,s.id,'reversal',p.amount,p.id,now(),p.received_by,trim(reason),auth.uid());
 update public.ps_shifts set fine_paid=false where id=s.id;
 return request_id;
end $$;
revoke all on function public.ps_record_fine_payment(uuid,integer,uuid,timestamptz,text,text) from public,anon,authenticated;
revoke all on function public.ps_reverse_fine_payment(uuid,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.ps_record_fine_payment(uuid,integer,uuid,timestamptz,text,text) to authenticated;
grant execute on function public.ps_reverse_fine_payment(uuid,integer,uuid,text) to authenticated;
commit;
