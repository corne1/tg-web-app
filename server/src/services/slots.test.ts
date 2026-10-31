import { generateSlotsFromBusy } from "./slots.js";
import type { WorkingHours } from "../lib/workingHours.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const hours: WorkingHours = {
  mon: { enabled: true, start: "10:00", end: "12:00" },
  tue: { enabled: false, start: "10:00", end: "12:00" },
  wed: { enabled: false, start: "10:00", end: "12:00" },
  thu: { enabled: false, start: "10:00", end: "12:00" },
  fri: { enabled: false, start: "10:00", end: "12:00" },
  sat: { enabled: false, start: "10:00", end: "12:00" },
  sun: { enabled: false, start: "10:00", end: "12:00" },
};

// Monday 2024-01-01 00:00 UTC ≈ Sunday evening Moscow — use a fixed Monday morning Moscow.
// 2024-06-03 is Monday. Noon UTC = 15:00 Moscow — pick early Monday UTC.
const mondayMorningUtc = Date.parse("2024-06-03T05:00:00.000Z"); // 08:00 MSK

const profile = {
  schedule: "weekday" as const,
  timezone: "Europe/Moscow",
  duration: 60 as const,
  working_hours: hours,
  day_break_min: null,
};

const slots = generateSlotsFromBusy(profile, new Set(), 1, mondayMorningUtc);
assert(slots.length === 2, `expected 2 slots (10:00, 11:00), got ${slots.length}`);
assert(slots.every((s) => s.available), "all available");

const busy = new Set([slots[0]!.startsAt]);
const withBusy = generateSlotsFromBusy(profile, busy, 1, mondayMorningUtc);
assert(withBusy[0]?.available === false, "first busy");
assert(withBusy[1]?.available === true, "second free");

const withBreak = generateSlotsFromBusy(
  { ...profile, day_break_min: 30 },
  new Set(),
  1,
  mondayMorningUtc,
);
// 10:00 then next would be 11:30 but end is 12:00 so only one 60-min slot
assert(withBreak.length === 1, `break spacing → 1 slot, got ${withBreak.length}`);

// ScheduleKind preset without custom hours: Mon–Fri 10–20, 60 min → many slots
const preset = generateSlotsFromBusy(
  {
    schedule: "weekday",
    timezone: "Europe/Moscow",
    duration: 60,
    working_hours: null,
    day_break_min: null,
  },
  new Set(),
  1,
  mondayMorningUtc,
);
assert(preset.length === 10, `preset weekday day → 10 slots, got ${preset.length}`);

console.log("slots.test.ts: ok");
