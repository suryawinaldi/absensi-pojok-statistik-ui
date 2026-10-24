import { divisionRank } from "./agent-divisions.js";
export const CORE_POSITIONS = [
  "Ketua Agen Pojok Statistik",
  "Wakil Ketua Agen",
  "Sekretaris dan Bendahara",
  "Sekretaris",
  "Bendahara",
  "Koordinator Analisis Data dan Pelayanan",
  "Koordinator Media Kreatif",
];
export const MEMBER_POSITIONS = ["BPH", "Anggota"];
export function searchText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("id")
    .trim()
    .replace(/\s+/g, " ");
}
export const isCoreDivision = (division) =>
  ["pengurus inti", "pi"].includes(searchText(division));
export function positionChoices(division, current = "") {
  return [
    ...new Set(
      [
        ...(isCoreDivision(division) ? CORE_POSITIONS : MEMBER_POSITIONS),
        current,
      ].filter(Boolean),
    ),
  ];
}
export function positionKind(agent) {
  if (isCoreDivision(agent.division)) return "pi";
  const role = searchText(agent.position);
  if (role === "bph") return "bph";
  if (role === "anggota") return "anggota";
  return "other";
}
export function matchingAgents(agents, query = "") {
  const terms = searchText(query).split(" ").filter(Boolean);
  return agents.filter((a) =>
    terms.every((term) => searchText(a.name).includes(term)),
  );
}
function roleRank(agent) {
  if (isCoreDivision(agent.division)) {
    const role = searchText(agent.position);
    if (role.startsWith("ketua")) return 0;
    if (role.startsWith("wakil")) return 1;
    if (role.includes("sekretaris") && role.includes("bendahara")) return 2;
    if (role.startsWith("sekretaris")) return 3;
    if (role.startsWith("bendahara")) return 4;
    if (/koordinator|koordinasi/.test(role) && /analisis|pelayanan/.test(role))
      return 5;
    if (/koordinator|koordinasi/.test(role) && role.includes("media")) return 6;
    return CORE_POSITIONS.length;
  }
  return positionKind(agent) === "bph" ? 0 : 1;
}
export function directoryAgents(
  agents,
  { query = "", division = "", role = "", sort = "division" } = {},
) {
  const list = matchingAgents(agents, query).filter(
    (a) =>
      (!division || a.division === division) &&
      (!role || positionKind(a) === role),
  );
  const byName = (a, b) =>
    a.name.localeCompare(b.name, "id", { sensitivity: "base" }) ||
    a.id.localeCompare(b.id);
  return list.sort((a, b) => {
    if (sort === "name-asc") return byName(a, b);
    if (sort === "name-desc") return -byName(a, b);
    return (
      divisionRank(a.division) - divisionRank(b.division) ||
      a.division.localeCompare(b.division, "id") ||
      roleRank(a) - roleRank(b) ||
      byName(a, b)
    );
  });
}
