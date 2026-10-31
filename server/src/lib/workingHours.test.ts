import {
  hasEnabledWorkingDay,
  normalizeWorkingHours,
  scheduleKindFromHours,
  timeToMinutes,
  windowsFor,
  type WorkingHours,
} from "./workingHours.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const monFri: WorkingHours = {
  mon: { enabled: true, start: "10:00", end: "19:00" },
  tue: { enabled: true, start: "10:00", end: "19:00" },
  wed: { enabled: true, start: "10:00", end: "19:00" },
  thu: { enabled: true, start: "10:00", end: "19:00" },
  fri: { enabled: true, start: "10:00", end: "19:00" },
  sat: { enabled: false, start: "10:00", end: "19:00" },
  sun: { enabled: false, start: "10:00", end: "19:00" },
};

assert(timeToMinutes("10:30") === 630, "timeToMinutes 10:30");
assert(timeToMinutes("bad") == null, "timeToMinutes invalid");

assert(hasEnabledWorkingDay(monFri), "has enabled day");
assert(scheduleKindFromHours(monFri) === "weekday", "schedule weekday");

const weekendOnly: WorkingHours = {
  ...monFri,
  mon: { ...monFri.mon, enabled: false },
  tue: { ...monFri.tue, enabled: false },
  wed: { ...monFri.wed, enabled: false },
  thu: { ...monFri.thu, enabled: false },
  fri: { ...monFri.fri, enabled: false },
  sat: { enabled: true, start: "12:00", end: "18:00" },
  sun: { enabled: true, start: "12:00", end: "18:00" },
};
assert(scheduleKindFromHours(weekendOnly) === "weekend", "schedule weekend");

// ScheduleKind presets when working_hours is null
const wedPreset = windowsFor("weekday", 3, null);
assert(wedPreset?.startMin === 10 * 60 && wedPreset.endMin === 20 * 60, "preset weekday");
assert(windowsFor("weekday", 0, null) == null, "preset sunday off");
assert(windowsFor("weekend", 6, null)?.startHour === 12, "preset sat");

// Custom hours override presets
const wedCustom = windowsFor("weekday", 3, monFri); // Wed
assert(wedCustom?.startMin === 10 * 60 && wedCustom.endMin === 19 * 60, "custom wed");
assert(windowsFor("weekday", 6, monFri) == null, "custom sat off");

const normalized = normalizeWorkingHours({
  mon: { enabled: true, start: "09:00", end: "17:00" },
});
assert(normalized?.mon.start === "09:00", "normalize start");
assert(normalized?.tue.enabled === true, "normalize fills defaults");

console.log("workingHours.test.ts: ok");
