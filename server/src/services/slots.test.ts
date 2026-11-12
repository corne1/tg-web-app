import { generateSlotsFromBusy } from "./slots.js";
import {
  defaultScheduleBreak,
  type WorkingHours,
} from "../lib/workingHours.js";

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
  working_hours: hours,
  schedule_break: defaultScheduleBreak(),
  day_break_min: null,
  travel_buffer_min: null,
};

const slots = generateSlotsFromBusy(profile, [], 1, mondayMorningUtc);
assert(slots.length === 2, `expected 2 slots (10:00, 11:00), got ${slots.length}`);
assert(slots.every((s) => s.available), "all available");

const busy = [{ startsAt: slots[0]!.startsAt, durationMin: 60 }];
const withBusy = generateSlotsFromBusy(profile, busy, 1, mondayMorningUtc);
assert(withBusy[0]?.available === false, "first busy");
assert(withBusy[1]?.available === true, "second free");

// 90-min booking at 10:00 blocks 11:00 start of a 60-min slot
const longBusy = [{ startsAt: slots[0]!.startsAt, durationMin: 90 }];
const withOverlap = generateSlotsFromBusy(
  profile,
  longBusy,
  1,
  mondayMorningUtc,
  { durationMin: 60 },
);
assert(withOverlap[0]?.available === false, "10:00 blocked");
assert(withOverlap.every((s) => !s.available || s.time !== "11:00"), "11:00 blocked by overlap");

const withBreak = generateSlotsFromBusy(
  { ...profile, day_break_min: 30 },
  [],
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
    working_hours: null,
    schedule_break: defaultScheduleBreak(),
    day_break_min: null,
    travel_buffer_min: null,
  },
  [],
  1,
  mondayMorningUtc,
);
assert(preset.length === 10, `preset weekday day → 10 slots, got ${preset.length}`);

const lunchHours: WorkingHours = {
  ...hours,
  mon: { enabled: true, start: "10:00", end: "16:00" },
};
const withLunch = generateSlotsFromBusy(
  {
    ...profile,
    working_hours: lunchHours,
    schedule_break: {
      enabled: true,
      start: "12:00",
      end: "13:00",
      days: ["mon"],
    },
  },
  [],
  1,
  mondayMorningUtc,
  { durationMin: 60 },
);
assert(
  withLunch.every((s) => s.time !== "12:00"),
  "lunch blocks 12:00 start",
);
assert(
  withLunch.some((s) => s.time === "11:00") &&
    withLunch.some((s) => s.time === "13:00"),
  "slots before/after lunch remain",
);

console.log("slots.test.ts: ok");
