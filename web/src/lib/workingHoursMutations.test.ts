/**
 * Working-hours edits. Run: npx tsx src/lib/workingHoursMutations.test.ts
 */
import { defaultWorkingHours } from "./masterDraft.ts";
import {
  copyHoursToDays,
  toggleWorkingDay,
  updateWorkingDayTime,
} from "./workingHoursMutations.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const base = defaultWorkingHours();
assert(base.mon.enabled && !base.sat.enabled, "weekday fixture");

const off = toggleWorkingDay(base, "mon");
assert(off.mon.enabled === false, "toggle disables monday");
assert(base.mon.enabled === true, "toggle does not mutate source");
assert(off.tue.enabled === true, "toggle leaves other days");
assert(toggleWorkingDay(off, "mon").mon.enabled === true, "toggle enables again");

const patched = updateWorkingDayTime(base, "tue", { start: "11:00" });
assert(patched.tue.start === "11:00", "patch start");
assert(patched.tue.end === "18:00" && patched.tue.enabled, "patch keeps the rest");
assert(base.tue.start === "10:00", "patch does not mutate source");

const source = updateWorkingDayTime(base, "mon", {
  start: "09:00",
  end: "15:00",
});
const copied = copyHoursToDays(source, "mon", ["sat", "sun"]);
assert(
  copied.sat.enabled && copied.sat.start === "09:00" && copied.sat.end === "15:00",
  "saturday receives monday hours",
);
assert(copied.sun.enabled && copied.sun.start === "09:00", "sunday receives monday hours");
assert(copied.tue.start === "10:00" && copied.tue.end === "18:00", "untargeted day stays");
assert(copied.mon.start === "09:00", "source day stays");
assert(!source.sat.enabled, "copy does not mutate source");

const fromDayOff = copyHoursToDays(base, "sat", ["mon"]);
assert(fromDayOff.mon.enabled, "target is enabled");
assert(
  fromDayOff.mon.start === "10:00" && fromDayOff.mon.end === "18:00",
  "hours come from a disabled source",
);
assert(!base.sat.enabled, "source day-off flag stays");

const untouched = copyHoursToDays(base, "mon", []);
assert(untouched.sat.enabled === false && untouched.mon.start === "10:00", "empty targets");

console.log("workingHoursMutations.test.ts: ok");
