-- Capture rules at first recorded attendance, never trust a client-supplied snapshot.
-- Existing records receive an explicitly marked baseline, not reconstructed history.
begin;
alter table public.ps_settings add column active_period text not null default '2026 / 2027'
  check (length(trim(active_period)) between 1 and 80);
alter table public.ps_shifts add column rules_snapshot jsonb;

-- Reject invalid hours even when a caller bypasses the HTML form.
create function public.ps_validate_operational_hours() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare d record; slot record; start_time text; end_time text;
begin
  if jsonb_typeof(new.operational_hours) <> 'object' then
    raise exception 'Jam operasional harus berupa objek.' using errcode='23514';
  end if;
  for d in select * from jsonb_each(new.operational_hours) loop
    if d.key not in ('Senin','Selasa','Rabu','Kamis','Jumat') or jsonb_typeof(d.value) <> 'object' then
      raise exception 'Hari operasional tidak valid.' using errcode='23514';
    end if;
    for slot in select * from jsonb_each(d.value) loop
      if slot.key not in ('Pagi','Siang') or jsonb_typeof(slot.value) <> 'object' then
        raise exception 'Sesi operasional tidak valid.' using errcode='23514';
      end if;
      start_time := slot.value ->> 'start'; end_time := slot.value ->> 'end';
      if start_time is null or end_time is null or
         start_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or
         end_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or end_time <= start_time or
         (slot.value ? 'active' and jsonb_typeof(slot.value->'active') <> 'boolean') then
        raise exception 'Jam tutup harus setelah jam buka dan format jam harus HH:MM.' using errcode='23514';
      end if;
    end loop;
  end loop;
  return new;
end; $$;
revoke all on function public.ps_validate_operational_hours() from public;
create trigger validate_operational_hours before insert or update on public.ps_settings
for each row execute function public.ps_validate_operational_hours();
-- Fail atomically if an existing configuration needs correction first.
update public.ps_settings set active_period = active_period;

create function public.ps_capture_attendance_rules() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  cfg public.ps_settings%rowtype;
  day_name text;
  session_cfg jsonb;
  start_time text;
  end_time text;
begin
  if tg_op = 'DELETE' then
    if old.fine_paid then raise exception 'Batalkan status lunas sebelum menghapus catatan.' using errcode = 'P0001'; end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    if old.fine_paid and row(new.agent_id,new.date,new.session,new.status,new.arrival_time,new.is_extra,new.is_pj)
      is distinct from row(old.agent_id,old.date,old.session,old.status,old.arrival_time,old.is_extra,old.is_pj) then
      raise exception 'Batalkan status lunas sebelum mengubah kehadiran.' using errcode = 'P0001';
    end if;
    if old.rules_snapshot is not null then
      if row(new.date,new.session) is distinct from row(old.date,old.session) then
        raise exception 'Catatan dengan aturan tersimpan tidak dapat dipindah tanggal atau sesi.' using errcode = 'P0001';
      end if;
      new.rules_snapshot := old.rules_snapshot;
      return new;
    end if;
  end if;
  new.rules_snapshot := null;
  if new.status = 'Belum dicatat' then return new; end if;
  select * into cfg from public.ps_settings limit 1;
  day_name := (array['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'])[extract(dow from new.date)::integer + 1];
  start_time := case when new.session = 'Pagi' then '10:00' else '13:30' end;
  end_time := case when new.session = 'Pagi' then case when day_name = 'Jumat' then '11:30' else '12:30' end
    else case when day_name = 'Jumat' then '15:30' else '16:00' end end;
  session_cfg := jsonb_build_object('active',true,'start',start_time,'end',end_time)
    || coalesce(cfg.operational_hours -> day_name -> new.session, '{}'::jsonb);
  new.rules_snapshot := jsonb_build_object(
    'lateToleranceMinutes',coalesce(cfg.late_tolerance_minutes,15),
    'lateFineAmount',coalesce(cfg.late_fine_amount,5000),
    'absentFineAmount',coalesce(cfg.absent_fine_amount,10000),
    'session',session_cfg,'capturedAt',now(),'source','attendance');
  return new;
end; $$;
revoke all on function public.ps_capture_attendance_rules() from public;
create trigger capture_attendance_rules before insert or update or delete on public.ps_shifts
  for each row execute function public.ps_capture_attendance_rules();
-- Trigger computes snapshots under the same rules as new records.
update public.ps_shifts set rules_snapshot = null where status <> 'Belum dicatat';
-- Mark migration baselines without allowing ordinary clients to modify snapshots.
alter table public.ps_shifts disable trigger capture_attendance_rules;
update public.ps_shifts set rules_snapshot = jsonb_set(rules_snapshot,'{source}','"migration_baseline"')
  where rules_snapshot is not null;
alter table public.ps_shifts enable trigger capture_attendance_rules;
commit;
