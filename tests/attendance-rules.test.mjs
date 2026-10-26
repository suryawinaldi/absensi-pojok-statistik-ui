import test from "node:test";
import assert from "node:assert/strict";
import {
  durationMinutes,
  contribution,
  shiftFine,
} from "../admin/src/attendance-rules.js";
import { divisionChoices, DIVISIONS } from "../admin/src/agent-divisions.js";
const session = { active: true, start: "10:00", end: "12:30" };
const settings = {
  lateToleranceMinutes: 15,
  lateFineAmount: 5000,
  absentFineAmount: 20000,
};
test("volunteers are exempt regardless of arrival time or attendance status", () => {
  for (const time of ["00:00", "09:30", "10:00", "10:40", "12:30", "23:59"]) {
    for (const status of ["Hadir", "Tidak hadir", "Izin", "Belum dicatat"]) {
      assert.equal(
        shiftFine({ extra: true, status, time }, settings, session).amount,
        0,
      );
    }
  }
  assert.equal(
    shiftFine(
      { extra: false, pj: false, status: "Hadir", time: "10:40" },
      settings,
      session,
    ).amount,
    5000,
  );
  assert.equal(
    shiftFine(
      { extra: false, pj: false, status: "Tidak hadir" },
      settings,
      session,
    ).amount,
    20000,
  );
});
test("a volunteer adds appreciation minutes but no regular attendance session", () => {
  const helper = { extra: true, status: "Hadir", time: "10:40" };
  assert.deepEqual(contribution(helper, session), {
    regularSessions: 0,
    extraMinutes: 110,
    totalMinutes: 110,
  });
  assert.deepEqual(contribution({ ...helper, extra: false }, session), {
    regularSessions: 1,
    extraMinutes: 0,
    totalMinutes: 110,
  });
});
test("minutes are clamped to the session window without creating a volunteer fine", () => {
  assert.equal(
    durationMinutes({ extra: true, status: "Hadir", time: "09:30" }, session),
    150,
  );
  assert.equal(
    durationMinutes({ extra: true, status: "Hadir", time: "12:45" }, session),
    0,
  );
  assert.equal(durationMinutes({ status: "Izin", time: "10:00" }, session), 0);
  assert.equal(durationMinutes({ status: "Hadir", time: "25:10" }, session), 0);
});
test("division choices include both distinct divisions and preserve existing labels", () => {
  const choices = divisionChoices(
    [{ division: "Divisi Arsip" }, { division: "Analisis Data" }],
    "Analisis & Pelayanan",
  );
  assert.deepEqual(choices.slice(0, 4), DIVISIONS);
  assert.ok(choices.includes("Pelayanan dan Konsultasi"));
  assert.ok(choices.includes("Analisis Data"));
  assert.ok(choices.includes("Divisi Arsip"));
  assert.ok(choices.includes("Analisis & Pelayanan"));
  assert.equal(choices.filter((x) => x === "Analisis Data").length, 1);
  assert.equal(divisionChoices().includes("Analisis & Pelayanan"), false);
});

// A changed configuration must never rewrite a captured historical result.
{
  const shift = { status: "Hadir", time: "10:30", rulesSnapshot: {
    lateToleranceMinutes: 15, lateFineAmount: 5000, absentFineAmount: 10000,
    session: { active: true, start: "10:00", end: "12:30" }
  }};
  assert.equal(shiftFine(shift, { lateFineAmount: 9000, lateToleranceMinutes: 90 }, {start:"11:00"}).amount, 5000);
  assert.equal(durationMinutes(shift, { active: false, start: "11:00", end: "11:30" }), 120);
}
