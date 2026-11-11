import {
  bookingEndMs,
  intervalsOverlap,
  slotConflictsWithBusy,
} from "./bookingInterval.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(intervalsOverlap(0, 60, 30, 90), "partial overlap");
assert(!intervalsOverlap(0, 60, 60, 120), "touching end is ok");
assert(intervalsOverlap(0, 60, 0, 60), "identical");

const a = "2024-06-03T10:00:00.000Z";
const b = "2024-06-03T10:30:00.000Z";
assert(bookingEndMs(a, 60) === Date.parse(a) + 60 * 60_000, "end ms");

assert(
  slotConflictsWithBusy(b, 60, [{ startsAt: a, durationMin: 60 }]),
  "30min shift into 60min booking",
);
assert(
  !slotConflictsWithBusy(b, 60, [{ id: "x", startsAt: a, durationMin: 60 }], {
    excludeBookingId: "x",
  }),
  "exclude self",
);
assert(
  !slotConflictsWithBusy("2024-06-03T11:00:00.000Z", 60, [
    { startsAt: a, durationMin: 60 },
  ]),
  "back-to-back ok",
);

console.log("bookingInterval.test.ts: ok");
