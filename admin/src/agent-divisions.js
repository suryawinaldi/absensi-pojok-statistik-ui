export const DIVISIONS = [
  "Pengurus Inti",
  "Pelayanan dan Konsultasi",
  "Analisis Data",
  "Media Kreatif",
];
// Preserve existing/custom labels during edits; never guess individual membership.
export function divisionChoices(agents = [], current = "") {
  return [
    ...new Set(
      [...DIVISIONS, ...agents.map((a) => a.division), current]
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => value.trim()),
    ),
  ];
}
export function divisionRank(division) {
  const index = DIVISIONS.indexOf(division);
  return index < 0 ? DIVISIONS.length : index;
}
