import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const ADMIN = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const AGENT = "33333333-3333-4333-8333-333333333333";

test("workspace migration and access policies on local PostgreSQL", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  // Minimal Supabase-owned schemas. Application SQL runs unchanged below.
  await db.exec(`
  create role anon; create role authenticated;
  create schema auth; create schema storage;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
   select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid;
  $$;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/');$$;
  grant usage on schema auth,storage,public to anon,authenticated;
  grant select,insert,delete on storage.objects to anon,authenticated;
  insert into auth.users values ('${ADMIN}'),('${OTHER}');
 `);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610230001_admin_workspace.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const actor = async (user, role = "authenticated") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      user || "",
    ]);
    await db.exec(`set role ${role}`);
  };
  await t.test("only one admin can be registered", async () => {
    await db.query("insert into ps_admin(user_id) values ($1)", [ADMIN]);
    await assert.rejects(
      db.query("insert into ps_admin(user_id) values ($1)", [OTHER]),
      /duplicate key/,
    );
    await assert.rejects(
      db.query("insert into ps_admin(singleton,user_id) values (false,$1)", [
        OTHER,
      ]),
      /check constraint/,
    );
  });
  await t.test(
    "anonymous requests cannot access workspace records",
    async () => {
      await actor(null, "anon");
      await assert.rejects(
        db.query("select * from ps_agents"),
        /permission denied/,
      );
      assert.equal(
        (
          await db.query(
            "select * from storage.objects where bucket_id='pojok-media'",
          )
        ).rows.length,
        0,
      );
    },
  );
  await t.test(
    "a signed-in nonadmin cannot grant themselves access or write data",
    async () => {
      await actor(OTHER);
      assert.equal((await db.query("select * from ps_admin")).rows.length, 0);
      assert.equal((await db.query("select * from ps_agents")).rows.length, 0);
      await assert.rejects(
        db.query("insert into ps_admin(user_id) values ($1)", [OTHER]),
        /permission denied/,
      );
      await assert.rejects(
        db.query(
          "insert into ps_agents(name,division,position) values ('Other','Media','Anggota')",
        ),
        /row-level security/,
      );
    },
  );
  await t.test(
    "admin can create records and receives immutable actor audit entries",
    async () => {
      await actor(ADMIN);
      await db.query(
        "insert into ps_agents(id,name,division,position) values ($1,$2,$3,$4)",
        [AGENT, "Agen Uji", "Media Kreatif", "Anggota"],
      );
      const log = (await db.query("select * from ps_audit_log")).rows;
      assert.equal(log.length, 1);
      assert.equal(log[0].actor_id, ADMIN);
      assert.equal(log[0].action, "INSERT");
      await assert.rejects(
        db.query("delete from ps_audit_log"),
        /permission denied/,
      );
    },
  );
  await t.test(
    "database rejects duplicate assignments and attendance without time",
    async () => {
      const insert =
        "insert into ps_shifts(agent_id,date,session) values ($1,'2026-11-01','Pagi')";
      await db.query(insert, [AGENT]);
      await assert.rejects(db.query(insert, [AGENT]), /ps_shift_once/);
      await assert.rejects(
        db.query("update ps_shifts set status='Hadir'"),
        /ps_arrival_matches_status/,
      );
      await db.query(
        "update ps_shifts set status='Hadir',arrival_time='10:05',is_extra=true,fine_paid=true",
      );
      const updatedShift = (
        await db.query("select version, is_extra, fine_paid from ps_shifts")
      ).rows[0];
      assert.equal(updatedShift.version, 2);
      assert.equal(updatedShift.is_extra, true);
      assert.equal(updatedShift.fine_paid, true);

      // Weekly schedule & operational settings
      await db.query(
        "insert into ps_weekly_schedule(agent_id,day_name,session,is_pj) values ($1,'Senin','Pagi',true)",
        [AGENT],
      );
      await assert.rejects(
        db.query(
          "insert into ps_weekly_schedule(agent_id,day_name,session) values ($1,'Senin','Pagi')",
          [AGENT],
        ),
        /ps_weekly_once/,
      );
      await db.query(
        "insert into ps_settings(late_tolerance_minutes,late_fine_amount,absent_fine_amount) values (15,5000,10000)",
      );
      assert.equal(
        (await db.query("select late_fine_amount from ps_settings")).rows[0]
          .late_fine_amount,
        5000,
      );
    },
  );
  await t.test(
    "optimistic version matching prevents overwriting newer records",
    async () => {
      await db.query(
        "update ps_agents set name='Nama Baru' where id=$1 and version=1",
        [AGENT],
      );
      const result = await db.query(
        "update ps_agents set name='Nama Lama' where id=$1 and version=1 returning id",
        [AGENT],
      );
      assert.equal(result.rows.length, 0);
      assert.equal(
        (await db.query("select name from ps_agents where id=$1", [AGENT]))
          .rows[0].name,
        "Nama Baru",
      );
    },
  );
  await t.test(
    "published content requires a real Instagram URL shape",
    async () => {
      const sql =
        "insert into ps_posts(title,publish_date,publish_time,format,status,agent_id,instagram_url) values ('Konten','2026-11-01','19:00','Feed','Terbit',$1,$2)";
      await assert.rejects(
        db.query(sql, [AGENT, ""]),
        /ps_published_requires_url/,
      );
      await assert.rejects(
        db.query(sql, [AGENT, "https://instagram.com.evil.example/p/x"]),
        /ps_instagram_url/,
      );
      await db.query(sql, [AGENT, "https://www.instagram.com/p/example/"]);
    },
  );
  await t.test(
    "legacy import is atomic, repeatable, and restricted to the admin",
    async () => {
      await actor(ADMIN);
      const records = [
        {
          legacy_id: "old-1",
          name: "Agen Lama",
          division: "Media Kreatif",
          position: "BPH",
        },
      ];
      const first = (
        await db.query("select ps_import_agents($1::jsonb) as result", [
          JSON.stringify(records),
        ])
      ).rows[0].result;
      assert.deepEqual(first, { imported: 1, skipped: 0 });
      const again = (
        await db.query("select ps_import_agents($1::jsonb) as result", [
          JSON.stringify(records),
        ])
      ).rows[0].result;
      assert.deepEqual(again, { imported: 0, skipped: 1 });
      const invalid = [
        { legacy_id: "old-2", name: "Valid", division: "Media" },
        { legacy_id: "old-3", name: "", division: "Media" },
      ];
      await assert.rejects(
        db.query("select ps_import_agents($1::jsonb)", [
          JSON.stringify(invalid),
        ]),
      );
      assert.equal(
        (
          await db.query(
            "select * from ps_legacy_agent_map where legacy_id='old-2'",
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (await db.query("select * from ps_agents where name='Valid'")).rows
          .length,
        0,
      );
      await actor(OTHER);
      await assert.rejects(
        db.query("select ps_import_agents($1::jsonb)", [
          JSON.stringify(records),
        ]),
        /insufficient_privilege|insufficient privilege/,
      );
      await actor(ADMIN);
    },
  );
  await t.test(
    "media are private and only the admin can manage bucket objects",
    async () => {
      await db.query(
        "insert into storage.objects(bucket_id,name) values ('pojok-media','agents/photo.jpg')",
      );
      assert.equal(
        (await db.query("select * from storage.objects")).rows.length,
        1,
      );
      await assert.rejects(
        db.query(
          "insert into storage.objects(bucket_id,name) values ('other','agents/photo.jpg')",
        ),
        /row-level security/,
      );
      await actor(OTHER);
      assert.equal(
        (await db.query("select * from storage.objects")).rows.length,
        0,
      );
      await assert.rejects(
        db.query(
          "insert into storage.objects(bucket_id,name) values ('pojok-media','agents/photo.jpg')",
        ),
        /row-level security/,
      );
      await actor(null, "anon");
      assert.equal(
        (await db.query("select * from storage.objects")).rows.length,
        0,
      );
    },
  );
  await t.test("history migration locks rules and paid records while preserving RLS", async () => {
    await db.exec("reset role");
    await db.exec(await readFile(new URL("../supabase/migrations/20261026070244_preserve_attendance_rules_and_period.sql", import.meta.url), "utf8"));
    await actor(ADMIN);
    const baseline = (await db.query("select rules_snapshot from ps_shifts limit 1")).rows[0].rules_snapshot;
    assert.equal(baseline.source, "migration_baseline");
    await db.query("update ps_settings set late_fine_amount=7000, active_period='2027 / 2028'");
    await db.query("insert into ps_shifts(agent_id,date,session,status,arrival_time,rules_snapshot) values ($1,'2026-10-26','Pagi','Hadir','10:30',$2)", [AGENT, JSON.stringify({lateFineAmount: 1})]);
    let row = (await db.query("select * from ps_shifts where date='2026-10-26'")).rows[0];
    assert.equal(row.rules_snapshot.lateFineAmount, 7000, "server ignores supplied snapshot");
    await db.query("update ps_settings set late_fine_amount=9000");
    await db.query("update ps_shifts set arrival_time='10:40', rules_snapshot='{}' where id=$1", [row.id]);
    row = (await db.query("select * from ps_shifts where id=$1", [row.id])).rows[0];
    assert.equal(row.rules_snapshot.lateFineAmount, 7000);
    await db.query("update ps_shifts set fine_paid=true where id=$1", [row.id]);
    await assert.rejects(db.query("update ps_shifts set status='Tidak hadir',arrival_time=null where id=$1", [row.id]), /Batalkan status lunas/);
    await assert.rejects(db.query("delete from ps_shifts where id=$1", [row.id]), /Batalkan status lunas/);
    await db.query("update ps_shifts set fine_paid=false where id=$1", [row.id]);
    await db.query("update ps_shifts set status='Tidak hadir',arrival_time=null where id=$1", [row.id]);
    await assert.rejects(db.query("update ps_shifts set date='2026-10-27' where id=$1", [row.id]), /tidak dapat dipindah/);
    await assert.rejects(db.query("update ps_settings set active_period=' '"), /check constraint/);
    await assert.rejects(db.query("update ps_settings set operational_hours=$1", [JSON.stringify({Senin:{Pagi:{start:"12:00",end:"10:00"}}})]), /Jam tutup/);
    await actor(OTHER);
    assert.equal((await db.query("select * from ps_shifts")).rows.length, 0);
    assert.equal((await db.query("select * from ps_settings")).rows.length, 0);
    await assert.rejects(db.query("select ps_capture_attendance_rules()"), /permission denied/);
  });

  await t.test("online duty validates service agents, freezes client owners and isolates permissions", async () => {
    await db.exec("reset role");
    await db.exec(await readFile(new URL("../supabase/migrations/20261026151157_online_duty_and_client_services.sql", import.meta.url), "utf8"));
    await actor(ADMIN);
    const A = "55555555-5555-4555-8555-555555555555", B = "66666666-6666-4666-8666-666666666666";
    await db.query("insert into ps_agents(id,name,division,position) values ($1,'Petugas A','Pelayanan dan Konsultasi','Anggota'),($2,'Petugas B','Pelayanan dan Konsultasi','Anggota')", [A,B]);
    const insertRoster = "insert into ps_online_roster(channel,weekday,valid_from,starts_at,ends_at,agent_id) values ($1,1,'2026-10-26','09:00','17:00',$2) returning *";
    await assert.rejects(db.query(insertRoster,['OA LINE',AGENT]), /Petugas wajib/);
    const roster=(await db.query(insertRoster,['OA LINE',A])).rows[0];
    await assert.rejects(db.query(insertRoster,['OA LINE',B]), /bertabrakan/);
    await db.query(insertRoster,['Instagram',B]);
    await assert.rejects(db.query("update ps_online_roster set agent_id=$1 where id=$2",[B,roster.id]), /tidak ditimpa/);
    const clientRow = (await db.query("insert into ps_online_clients(name,line_id,first_contact_at,summary) values ('Klien Uji','line-test','2026-10-26T10:00:00+07:00','Uji lokal') returning *")).rows[0];
    assert.equal(clientRow.owner_id,A);
    assert.equal(clientRow.assignment_source,'roster');
    await db.query("insert into ps_online_roster(channel,weekday,valid_from,valid_until,exception_date,starts_at,ends_at,agent_id,reason) values ('OA LINE',1,'2026-10-26','2026-10-26','2026-10-26','09:00','17:00',$1,'Pengganti harian')",[B]);
    assert.equal((await db.query("select ps_online_resolve('OA LINE','2026-10-26T10:00:00+07:00') as agent")).rows[0].agent,B);
    await db.query("update ps_online_clients set status='Dalam penanganan' where id=$1",[clientRow.id]);
    assert.equal((await db.query("select owner_id from ps_online_clients where id=$1",[clientRow.id])).rows[0].owner_id,A);
    await assert.rejects(db.query("update ps_online_clients set owner_id=$1 where id=$2",[B,clientRow.id]), /alasan/);
    await db.query("update ps_online_clients set owner_id=$1,transfer_reason='Petugas awal cuti' where id=$2",[B,clientRow.id]);
    const transfer=(await db.query("select * from ps_online_events where entity_id=$1 and old_owner=$2 and new_owner=$3",[clientRow.id,A,B])).rows;
    assert.equal(transfer.length,1);
    await assert.rejects(db.query("insert into ps_online_clients(name,line_id,first_contact_at) values ('Nama lain','line-test','2026-10-27T10:00:00+07:00')"), /duplicate key/);
    const late=(await db.query("insert into ps_online_clients(name,first_contact_at) values ('Di luar jam','2026-10-26T18:00:00+07:00') returning *")).rows[0];
    assert.equal(late.owner_id,null);
    await db.query("insert into ps_online_notes(client_id,body,occurred_at) values ($1,'Catatan admin','2026-10-26T11:00:00+07:00')",[clientRow.id]);
    await assert.rejects(db.query("update ps_online_notes set body='Ditimpa'"), /permission denied/);
    await assert.rejects(db.query("insert into ps_online_notes(client_id,body,occurred_at,actor_id) values ($1,'Palsu',now(),$2)",[clientRow.id,OTHER]), /row-level security/);
    await db.query("insert into ps_posts(title,publish_date,publish_time,format,status,agent_id,instagram_url) values ('Publikasi uji','2026-10-26','10:00','Feed','Terbit',$1,'https://instagram.com/p/test')",[AGENT]);
    const post=(await db.query("select * from ps_posts where title='Publikasi uji'")).rows[0];
    assert.equal(post.online_publisher_id,B);
    await db.query("update ps_posts set online_publisher_id=$1 where id=$2",[A,post.id]);
    assert.equal((await db.query("select online_publisher_id from ps_posts where id=$1",[post.id])).rows[0].online_publisher_id,B);
    await db.query("update ps_agents set active=false where id=$1",[B]);
    assert.equal((await db.query("select ps_online_resolve('OA LINE','2026-10-26T10:00:00+07:00') as agent")).rows[0].agent,null);
    await db.query("update ps_online_clients set status='Selesai' where id=$1",[clientRow.id]);
    assert.equal((await db.query("select owner_id from ps_online_clients where id=$1",[clientRow.id])).rows[0].owner_id,B);
    await actor(OTHER);
    for(const table of ['ps_online_roster','ps_online_clients','ps_online_notes','ps_online_events']) assert.equal((await db.query(`select * from ${table}`)).rows.length,0);
    await assert.rejects(db.query("insert into ps_online_clients(name,first_contact_at) values ('Tidak boleh',now())"), /row-level security/);
    await actor(null,'anon');
    await assert.rejects(db.query("select * from ps_online_clients"), /permission denied/);
  });

});
