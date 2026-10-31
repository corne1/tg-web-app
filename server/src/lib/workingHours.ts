import type { ScheduleKind } from "../db/types.js";

export type WeekdayId =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

export type DayHours = {
  enabled: boolean;
  start: string;
  end: string;
};

export type WorkingHours = Record<WeekdayId, DayHours>;

export const WEEKDAY_IDS: WeekdayId[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

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

export function timeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function defaultDay(enabled: boolean, start = "10:00", end = "18:00"): DayHours {
  return { enabled, start, end };
}

export function defaultWorkingHours(): WorkingHours {
  return {
    mon: defaultDay(true),
    tue: defaultDay(true),
    wed: defaultDay(true),
    thu: defaultDay(true),
    fri: defaultDay(true),
    sat: defaultDay(false),
    sun: defaultDay(false),
  };
}

export function normalizeWorkingHours(
  raw: unknown,
): WorkingHours | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Partial<Record<WeekdayId, Partial<DayHours>>>;
  const base = defaultWorkingHours();
  let any = false;
  for (const id of WEEKDAY_IDS) {
    const row = src[id];
    if (!row || typeof row !== "object") continue;
    any = true;
    const start = typeof row.start === "string" ? row.start : base[id].start;
    const end = typeof row.end === "string" ? row.end : base[id].end;
    if (timeToMinutes(start) == null || timeToMinutes(end) == null) continue;
    base[id] = {
      enabled: Boolean(row.enabled),
      start,
      end,
    };
  }
  return any ? base : null;
}

export function parseWorkingHoursJson(
  raw: string | null | undefined,
): WorkingHours | null {
  if (!raw) return null;
  try {
    return normalizeWorkingHours(JSON.parse(raw));
  } catch {
    return null;
  }
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
