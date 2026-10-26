import test from "node:test";
import assert from "node:assert/strict";
import {
  matchingAgents,
  directoryAgents,
  positionChoices,
  positionKind,
} from "../admin/src/agent-directory.js";
const agents = [
  {
    id: "1",
    name: "Surya Utama",
    division: "Pengurus Inti",
    position: "Ketua Agen Pojok Statistik",
  },
  { id: "2", name: "Nadia Suci", division: "Media Kreatif", position: "BPH" },
  {
    id: "3",
    name: "Agus Sutanto",
    division: "Analisis Data",
    position: "Anggota",
  },
  { id: "4", name: "Ana", division: "Media Kreatif", position: "Anggota" },
  {
    id: "5",
    name: "Zaki",
    division: "Pengurus Inti",
    position: "Wakil Ketua Agen",
  },
];
test("name fragments match anywhere, not only a prefix, ignoring case and whitespace", () => {
  assert.deepEqual(
    matchingAgents(agents, " SU ").map((a) => a.id),
    ["1", "2", "3"],
  );
  assert.deepEqual(
    matchingAgents(agents, "agus su").map((a) => a.id),
    ["3"],
  );
  assert.equal(matchingAgents(agents, "unmatched").length, 0);
});
test("directory combines typed search with division and role filters", () => {
  assert.deepEqual(
    directoryAgents(agents, {
      query: "su",
      division: "Media Kreatif",
      role: "bph",
    }).map((a) => a.id),
    ["2"],
  );
  assert.deepEqual(
    directoryAgents(agents, { role: "pi" }).map((a) => a.id),
    ["1", "5"],
  );
});
test("sort modes and PI role order do not mutate stored agent data", () => {
  const original = structuredClone(agents);
  assert.deepEqual(
    directoryAgents(agents, { query: "su", sort: "name-asc" }).map((a) => a.id),
    ["3", "2", "1"],
  );
  assert.deepEqual(
    directoryAgents(agents, { query: "su", sort: "name-desc" }).map(
      (a) => a.id,
    ),
    ["1", "2", "3"],
  );
  assert.deepEqual(
    directoryAgents(agents)
      .slice(0, 2)
      .map((a) => a.id),
    ["1", "5"],
  );
  assert.deepEqual(agents, original);
});
test("PI suggestions and BPH/member presets preserve custom existing positions", () => {
  assert.ok(
    positionChoices("Pengurus Inti").includes(
      "Koordinator Analisis Data dan Pelayanan",
    ),
  );
  assert.ok(
    positionChoices("Pengurus Inti", "Koordinator Program").includes(
      "Koordinator Program",
    ),
  );
  assert.deepEqual(positionChoices("Analisis Data"), ["BPH", "Anggota"]);
  assert.equal(
    positionKind({ division: "Pelayanan dan Konsultasi", position: "BPH" }),
    "bph",
  );
  assert.equal(
    positionKind({ division: "Analisis Data", position: "Koordinator lama" }),
    "other",
  );
});
test("same-name agents remain distinct by ID for explicit selection", () => {
  const duplicate = [
    ...agents,
    { ...agents[0], id: "another", division: "Analisis Data" },
  ];
  assert.deepEqual(
    matchingAgents(duplicate, "Surya Utama").map((a) => a.id),
    ["1", "another"],
  );
});

test("name search does not return unrelated names just because a division contains su", () => {
  const input = [
    {
      id: "x",
      name: "Nadia",
      division: "Pelayanan dan Konsultasi",
      position: "Anggota",
    },
  ];
  assert.equal(matchingAgents(input, "su").length, 0);
});

test("older PI role labels keep hierarchy without renaming stored positions", () => {
  const rows = [
    {
      id: "v",
      name: "Aaa",
      division: "Pengurus Inti",
      position: "Wakil Ketua",
    },
    { id: "c", name: "Zzz", division: "Pengurus Inti", position: "Ketua Agen" },
  ];
  const result = directoryAgents(rows);
  assert.deepEqual(
    result.map((a) => a.id),
    ["c", "v"],
  );
  assert.equal(result[0].position, "Ketua Agen");
});

test("period filter keeps historic profiles separate", () => {
  const agents = [
    {id:"old",name:"A",division:"Media",position:"Anggota",period:"2026 / 2027"},
    {id:"new",name:"B",division:"Media",position:"Anggota",period:"2027 / 2028"}
  ];
  assert.deepEqual(directoryAgents(agents, {period:"2027 / 2028"}).map(a=>a.id), ["new"]);
});
