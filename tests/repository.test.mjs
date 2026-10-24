import test from "node:test";
import assert from "node:assert/strict";
import {
  createRepository,
  emptyState,
  findChange,
} from "../admin/src/repository.js";

function fakeClient(response) {
  const calls = [],
    removed = [],
    uploaded = [];
  const chain = {
    eq(...args) {
      calls.push(["eq", ...args]);
      return this;
    },
    select() {
      return this;
    },
    maybeSingle: async () => response,
  };
  return {
    calls,
    removed,
    uploaded,
    from(table) {
      return {
        insert(row) {
          calls.push(["insert", table, row]);
          return chain;
        },
        update(row) {
          calls.push(["update", table, row]);
          return chain;
        },
        delete() {
          calls.push(["delete", table]);
          return chain;
        },
      };
    },
    storage: {
      from() {
        return {
          upload: async (path) => {
            uploaded.push(path);
            return { error: null };
          },
          remove: async (paths) => {
            removed.push(...paths);
            return { error: null };
          },
        };
      },
    },
  };
}
const agent = {
  id: "a1",
  name: "Agen",
  division: "Media",
  position: "Anggota",
  active: true,
  period: "2026 / 2027",
  photo: "",
  _photoPath: null,
  _version: 1,
};
const url = "https://example.supabase.co";
test("record changes are isolated; bulk partial writes are rejected", () => {
  const before = emptyState(),
    after = { ...emptyState(), agents: [agent] };
  assert.equal(findChange(before, after).kind, "insert");
  assert.throws(
    () => findChange(before, { ...after, shifts: [{ id: "s1" }] }),
    /One record/,
  );
});
test("failed backend writes never change the previous application state", async () => {
  const client = fakeClient({ data: null, error: { code: "42501" } }),
    repo = createRepository(client, { publicUrl: url });
  const before = { ...emptyState(), agents: [agent] },
    after = structuredClone(before);
  after.agents[0].name = "Edited";
  await assert.rejects(
    repo.commit(before, after),
    (error) => error.code === "42501",
  );
  assert.equal(before.agents[0].name, "Agen");
  assert.deepEqual(
    client.calls.filter((c) => c[0] === "eq"),
    [
      ["eq", "id", "a1"],
      ["eq", "version", 1],
    ],
  );
});
test("a stale row is a conflict, not a successful save", async () => {
  const client = fakeClient({ data: null, error: null }),
    repo = createRepository(client, { publicUrl: url });
  const before = { ...emptyState(), agents: [agent] },
    after = structuredClone(before);
  after.agents[0].name = "Edited";
  await assert.rejects(
    repo.commit(before, after),
    (error) => error.code === "CONFLICT",
  );
});
test("saved records use the server version", async () => {
  const client = fakeClient({
      data: { ...agent, version: 2, photo_path: null },
      error: null,
    }),
    repo = createRepository(client, { publicUrl: url });
  const before = { ...emptyState(), agents: [agent] },
    after = structuredClone(before);
  after.agents[0].name = "Edited";
  const saved = await repo.commit(before, after);
  assert.equal(saved.agents[0]._version, 2);
  assert.equal(saved.agents[0].name, "Edited");
});
test("definite DB rejection cleans up new media; ambiguous transport failures retain them", async () => {
  for (const error of [{ code: "23514" }, new TypeError("network failed")]) {
    const client = fakeClient({ data: null, error }),
      repo = createRepository(client, { publicUrl: url, uuid: () => "image" });
    const before = emptyState(),
      after = {
        ...emptyState(),
        agents: [{ ...agent, photo: "data:image/png;base64,aGVsbG8=" }],
      };
    await assert.rejects(repo.commit(before, after));
    assert.equal(client.uploaded.length, 1);
    assert.equal(client.removed.length, error.code ? 1 : 0);
  }
});
test("media rendering accepts only inline images or signed URLs from the configured project", () => {
  const repo = createRepository(fakeClient({}), { publicUrl: url });
  assert.equal(
    repo.isSafeMedia(
      "https://example.supabase.co/storage/v1/object/sign/pojok-media/agents/a.jpg?token=x",
    ),
    true,
  );
  assert.equal(
    repo.isSafeMedia(
      "https://example.supabase.co.evil.org/storage/v1/object/sign/pojok-media/a",
    ),
    false,
  );
  assert.equal(repo.isSafeMedia("javascript:alert(1)"), false);
});

test("missing extra columns never cause a silent retry that loses volunteer classification", async () => {
  const client = fakeClient({ data: null, error: { code: "PGRST204" } });
  const repo = createRepository(client, { publicUrl: url });
  const before = emptyState(),
    after = emptyState();
  after.shifts.push({
    id: "shift",
    agent: "a1",
    date: "2026-10-26",
    session: "Pagi",
    pj: false,
    extra: true,
    status: "Hadir",
    time: "11:00",
  });
  await assert.rejects(
    repo.commit(before, after),
    (error) => error.code === "PGRST204",
  );
  const inserts = client.calls.filter((call) => call[0] === "insert");
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0][2].is_extra, true);
  assert.equal(before.shifts.length, 0);
});
