function minutes(value) {
  if (typeof value !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(value))
    return null;
  const [h, m] = value.split(":").map(Number);
  return h < 24 && m < 60 ? h * 60 + m : null;
}
export function durationMinutes(shift, session) {
  session = shift.rulesSnapshot?.session || session;
  if (shift.status !== "Hadir" || session.active === false) return 0;
  const arrival = minutes(shift.time),
    start = minutes(session.start),
    end = minutes(session.end);
  if ([arrival, start, end].some((value) => value === null) || end <= start)
    return 0;
  return Math.max(0, end - Math.max(arrival, start));
}
export function contribution(shift, session) {
  const totalMinutes = durationMinutes(shift, session);
  return {
    totalMinutes,
    regularSessions: !shift.extra && totalMinutes > 0 ? 1 : 0,
    extraMinutes: shift.extra ? totalMinutes : 0,
  };
}
export function shiftFine(shift, settings, session) {
  settings = shift.rulesSnapshot || settings;
  session = shift.rulesSnapshot?.session || session;
  // Volunteer exemption is unconditional: arrival time, grace period, or any
  // configured late/absence amount must never turn a helper into a debtor.
  if (shift.extra) return { amount: 0, reason: "", exempt: true };
  if (shift.status === "Tidak hadir")
    return {
      amount: settings.absentFineAmount,
      reason: "Tidak hadir (Bolos)",
      exempt: false,
    };
  // PJ remains exempt from lateness only, never from an unexcused absence.
  if (shift.pj) return { amount: 0, reason: "", exempt: true };
  if (shift.status === "Hadir") {
    const start = minutes(session.start),
      arrival = minutes(shift.time);
    if (
      start !== null &&
      arrival !== null &&
      arrival > start + settings.lateToleranceMinutes
    )
      return {
        amount: settings.lateFineAmount,
        reason: `Terlambat ${arrival - start} mnt (${shift.time})`,
        exempt: false,
      };
  }
  return { amount: 0, reason: "", exempt: false };
}
