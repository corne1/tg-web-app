import type { ScheduleKind } from "../db/types.js";
import {
  defaultScheduleBreak,
  defaultWorkingHours,
  normalizeScheduleBreak,
  normalizeWorkingHours as normalizeHours,
  parseClockMinutes as timeToMinutes,
  WEEKDAY_IDS,
  type DayHours,
  type ScheduleBreak,
  type WeekdayId,
  type WorkingHours,
} from "./hoursNormalize.js";

export type { DayHours, ScheduleBreak, WeekdayId, WorkingHours };
export {
  defaultScheduleBreak,
  defaultWorkingHours,
  normalizeScheduleBreak,
  WEEKDAY_IDS,
  timeToMinutes,
};

/** Persist hours + optional break in one JSON blob. */
export function stringifyWorkingHoursBundle(
  hours: WorkingHours,
  scheduleBreak?: ScheduleBreak | null,
): string {
  if (scheduleBreak) {
    return JSON.stringify({ ...hours, break: scheduleBreak });
  }
  return JSON.stringify(hours);
}

export function parseWorkingHoursBundle(raw: string | null | undefined): {
  hours: WorkingHours | null;
  scheduleBreak: ScheduleBreak;
} {
  if (!raw) {
    return { hours: null, scheduleBreak: defaultScheduleBreak() };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    const hours = normalizeWorkingHours(parsed);
    const breakRaw =
      parsed && typeof parsed === "object"
        ? (parsed as { break?: unknown }).break
        : undefined;
    return {
      hours,
      scheduleBreak: normalizeScheduleBreak(breakRaw),
    };
  } catch {
    return { hours: null, scheduleBreak: defaultScheduleBreak() };
  }
}

/** Break window for a JS weekday (0=Sun…6=Sat), or null if inactive. */
export function breakWindowFor(
  scheduleBreak: ScheduleBreak | null | undefined,
  weekday: number,
): { startMin: number; endMin: number } | null {
  if (!scheduleBreak?.enabled || !scheduleBreak.start || !scheduleBreak.end) {
    return null;
  }
  const id = JS_WEEKDAY_TO_ID[weekday];
  if (!id || !scheduleBreak.days.includes(id)) return null;
  const startMin = timeToMinutes(scheduleBreak.start);
  const endMin = timeToMinutes(scheduleBreak.end);
  if (startMin == null || endMin == null || endMin <= startMin) return null;
  return { startMin, endMin };
}

/** JS getDay() / zonedParts.weekday: 0=Sun … 6=Sat → draft weekday id */
export const JS_WEEKDAY_TO_ID: WeekdayId[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export type DayWindow = { startHour: number; endHour: number; startMin: number; endMin: number };

export function normalizeWorkingHours(raw: unknown): WorkingHours | null {
  return normalizeHours(raw, "strict");
}

export function parseWorkingHoursJson(
  raw: string | null | undefined,
): WorkingHours | null {
  return parseWorkingHoursBundle(raw).hours;
}

/** Infer coarse ScheduleKind from custom hours (kept in sync with `schedule` column). */
export function scheduleKindFromHours(hours: WorkingHours): ScheduleKind {
  const enabled = WEEKDAY_IDS.filter((id) => hours[id].enabled);
  if (enabled.length === 0) return "manual";
  const onlyWeekend =
    enabled.every((id) => id === "sat" || id === "sun") &&
    enabled.length > 0;
  if (onlyWeekend) return "weekend";
  const weekdays: WeekdayId[] = ["mon", "tue", "wed", "thu", "fri"];
  const onlyWeekdays =
    enabled.length === 5 && weekdays.every((id) => hours[id].enabled);
  if (onlyWeekdays) return "weekday";
  return "manual";
}

/**
 * Window for a JS weekday. Prefer `working_hours` when set;
 * otherwise ScheduleKind presets for profiles without custom hours JSON.
 */
export function windowsFor(
  schedule: ScheduleKind,
  weekday: number,
  workingHours?: WorkingHours | null,
): DayWindow | null {
  if (workingHours) {
    const id = JS_WEEKDAY_TO_ID[weekday];
    if (!id) return null;
    const day = workingHours[id];
    if (!day?.enabled) return null;
    const startMin = timeToMinutes(day.start);
    const endMin = timeToMinutes(day.end);
    if (startMin == null || endMin == null || endMin <= startMin) return null;
    return {
      startHour: Math.floor(startMin / 60),
      endHour: Math.floor(endMin / 60),
      startMin,
      endMin,
    };
  }

  // Presets when working_hours_json is null (0=Sun … 6=Sat).
  if (schedule === "weekend") {
    if (weekday === 0 || weekday === 6) {
      return { startHour: 12, endHour: 18, startMin: 12 * 60, endMin: 18 * 60 };
    }
    return null;
  }
  // weekday + manual: Mon–Fri 10–20
  if (weekday >= 1 && weekday <= 5) {
    return { startHour: 10, endHour: 20, startMin: 10 * 60, endMin: 20 * 60 };
  }
  return null;
}

export function hasEnabledWorkingDay(hours: WorkingHours): boolean {
  return WEEKDAY_IDS.some((id) => hours[id].enabled);
}
