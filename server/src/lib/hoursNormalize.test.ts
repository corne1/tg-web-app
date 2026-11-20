/**
 * Shared hours normalizer. Run: npx tsx src/lib/hoursNormalize.test.ts
 */
import { normalizeWorkingHours } from "./hoursNormalize.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const form = normalizeWorkingHours(undefined, "form");
assert(form.mon.enabled && form.mon.start === "10:00", "form fills defaults");
assert(!form.sat.enabled, "form weekend off");

const kept = normalizeWorkingHours(
  { sat: { enabled: true, start: "99:99", end: "15:00" } },
  "form",
);
assert(kept.sat.start === "99:99", "form keeps the typed clock");
assert(kept.mon.enabled, "form keeps the other days");

const strict = normalizeWorkingHours(
  { mon: { enabled: true, start: "09:00", end: "17:00" } },
  "strict",
);
assert(strict?.mon.start === "09:00", "strict accepts a clock");
assert(strict?.tue.start === "10:00", "strict fills untouched days");

const dropped = normalizeWorkingHours(
  { mon: { enabled: true, start: "99:99", end: "17:00" } },
  "strict",
);
assert(dropped?.mon.start === "10:00", "strict drops an invalid clock");
assert(normalizeWorkingHours(undefined, "strict") === null, "strict empty is null");
assert(normalizeWorkingHours({}, "strict") === null, "strict object without days is null");

console.log("hoursNormalize.test.ts: ok");
