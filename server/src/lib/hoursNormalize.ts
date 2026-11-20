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

export type ScheduleBreak = {
  enabled: boolean;
  start: string | null;
  end: string | null;
  days: WeekdayId[];
};

export const WEEKDAY_IDS: WeekdayId[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

/** Strict clock parse. Invalid text is null. */
export function parseClockMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function defaultWorkingHours(): WorkingHours {
  const hours = {} as WorkingHours;
  for (const id of WEEKDAY_IDS) {
    const enabled = id !== "sat" && id !== "sun";
    hours[id] = { enabled, start: "10:00", end: "18:00" };
  }
  return hours;
}

export function defaultScheduleBreak(): ScheduleBreak {
  return {
    enabled: false,
    start: null,
    end: null,
    days: ["mon", "tue", "wed", "thu", "fri"],
  };
}

/**
 * `form` always returns seven days so the editor can render.
 * `strict` returns null when the payload has no day rows, and drops a day
 * whose clock text is not HH:MM.
 */
export function normalizeWorkingHours(raw: unknown, mode: "form"): WorkingHours;
export function normalizeWorkingHours(
  raw: unknown,
  mode: "strict",
): WorkingHours | null;
export function normalizeWorkingHours(
  raw: unknown,
  mode: "form" | "strict",
): WorkingHours | null {
  const base = defaultWorkingHours();
  if (!raw || typeof raw !== "object") {
    return mode === "form" ? base : null;
  }
  const src = raw as Partial<Record<WeekdayId, Partial<DayHours>>>;
  let any = false;
  for (const id of WEEKDAY_IDS) {
    const row = src[id];
    if (!row || typeof row !== "object") continue;
    any = true;
    const start = typeof row.start === "string" ? row.start : base[id].start;
    const end = typeof row.end === "string" ? row.end : base[id].end;
    if (
      mode === "strict" &&
      (parseClockMinutes(start) == null || parseClockMinutes(end) == null)
    ) {
      continue;
    }
    base[id] = {
      enabled: Boolean(row.enabled),
      start,
      end,
    };
  }
  if (mode === "strict" && !any) return null;
  return base;
}

export function normalizeScheduleBreak(raw: unknown): ScheduleBreak {
  const base = defaultScheduleBreak();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Partial<ScheduleBreak>;
  const days = Array.isArray(src.days)
    ? src.days.filter((day): day is WeekdayId =>
        (WEEKDAY_IDS as string[]).includes(String(day)),
      )
    : base.days;
  const start =
    typeof src.start === "string" && parseClockMinutes(src.start) != null
      ? src.start
      : null;
  const end =
    typeof src.end === "string" && parseClockMinutes(src.end) != null
      ? src.end
      : null;
  return {
    enabled: Boolean(src.enabled),
    start,
    end,
    days: days.length > 0 ? days : base.days,
  };
}
