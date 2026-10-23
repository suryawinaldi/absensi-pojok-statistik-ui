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
        "update ps_shifts set status='Hadir',arrival_time='10:05'",
      );
      assert.equal(
        (await db.query("select version from ps_shifts")).rows[0].version,
        2,
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
});
