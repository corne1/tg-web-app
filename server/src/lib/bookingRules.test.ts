import { canCancelBooking, canRescheduleBooking, hoursUntil } from "./bookingRules.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const now = new Date("2024-06-03T12:00:00.000Z");
const in48h = new Date(now.getTime() + 48 * 3600_000).toISOString();
const in2h = new Date(now.getTime() + 2 * 3600_000).toISOString();

assert(Math.abs(hoursUntil(in48h, now) - 48) < 0.01, "hoursUntil ~48");

assert(
  canCancelBooking({
    startsAt: in48h,
    cancelHours: 24,
    actorIsClient: true,
    now,
  }).ok,
  "client can cancel 48h ahead",
);

assert(
  !canCancelBooking({
    startsAt: in2h,
    cancelHours: 24,
    actorIsClient: true,
    now,
  }).ok,
  "client blocked inside window",
);

assert(
  canCancelBooking({
    startsAt: in2h,
    cancelHours: 24,
    actorIsClient: false,
    now,
  }).ok,
  "master can always cancel",
);

assert(
  !canRescheduleBooking({ startsAt: in2h, cancelHours: 24, now }).ok,
  "reschedule blocked",
);
assert(
  canRescheduleBooking({ startsAt: in48h, cancelHours: 24, now }).ok,
  "reschedule ok",
);

console.log("bookingRules.test.ts: ok");
