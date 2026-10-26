import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell } from "../admin/src/csv.js";
test("CSV preserves multiline and quoted names and neutralizes spreadsheet formulas", () => {
  assert.equal(csvCell('A, "B"'), '"A, ""B"""');
  assert.equal(csvCell('a\rb'), '"a\rb"');
  assert.equal(csvCell('=SUM(1)'), "'=SUM(1)");
  assert.equal(csvCell('  +123'), "'  +123");
  assert.equal(csvCell(-12), '-12');
  assert.equal(csvCell(null), '');
});
