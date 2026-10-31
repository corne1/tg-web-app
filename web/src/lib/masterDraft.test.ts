/**
 * Pure draft helpers (no DOM). Run: npx tsx src/lib/masterDraft.test.ts
 */
import {
  applyHoursPreset,
  hasEnabledWorkingDay,
  normalizeWorkingHours,
  timeToMinutes,
} from "./masterDraft.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(timeToMinutes("10:30") === 630, "timeToMinutes");

const preset = applyHoursPreset("mon-fri");
assert(preset.mon.enabled && !preset.sat.enabled, "mon-fri preset");
assert(hasEnabledWorkingDay(preset), "has enabled");

const normalized = normalizeWorkingHours({
  sat: { enabled: true, start: "11:00", end: "15:00" },
});
assert(normalized.sat.enabled && normalized.sat.start === "11:00", "normalize sat");
assert(normalized.mon.enabled === true, "defaults remain");

console.log("masterDraft.test.ts: ok");
