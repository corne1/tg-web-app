const DAY_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTH_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];
const MONTH_LONG = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

/** Parts of an instant in a given IANA timezone. */
export function zonedParts(
  date: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: weekdayMap[parts.weekday ?? "Mon"] ?? 1,
  };
}

/** Convert local wall time in timezone to UTC ISO string. */
export function localToUtcIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): string {
  // Binary search UTC instant that formats to the desired local time.
  let lo = Date.UTC(year, month - 1, day, hour, minute) - 14 * 3600 * 1000;
  let hi = Date.UTC(year, month - 1, day, hour, minute) + 14 * 3600 * 1000;
  for (let i = 0; i < 40; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const p = zonedParts(new Date(mid), timeZone);
    const cmp =
      p.year !== year
        ? p.year - year
        : p.month !== month
          ? p.month - month
          : p.day !== day
            ? p.day - day
            : p.hour !== hour
              ? p.hour - hour
              : p.minute - minute;
    if (cmp === 0) return new Date(mid).toISOString();
    if (cmp < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  return new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString();
}

export function formatTime(iso: string, timeZone: string): string {
  const p = zonedParts(new Date(iso), timeZone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function formatDayLabel(iso: string, timeZone: string): string {
  const p = zonedParts(new Date(iso), timeZone);
  return DAY_SHORT[p.weekday] ?? "";
}

export function formatDateShort(iso: string, timeZone: string): string {
  const p = zonedParts(new Date(iso), timeZone);
  return `${p.day} ${MONTH_SHORT[p.month - 1]}`;
}

export function formatDateLabel(iso: string, timeZone: string): string {
  const p = zonedParts(new Date(iso), timeZone);
  const today = zonedParts(new Date(), timeZone);
  const tomorrow = zonedParts(new Date(Date.now() + 86400000), timeZone);

  const sameDay =
    p.year === today.year && p.month === today.month && p.day === today.day;
  const isTomorrow =
    p.year === tomorrow.year &&
    p.month === tomorrow.month &&
    p.day === tomorrow.day;

  const datePart = `${p.day} ${MONTH_LONG[p.month - 1]}`;
  if (sameDay) return `Сегодня, ${datePart}`;
  if (isTomorrow) return `Завтра, ${datePart}`;
  return `${DAY_SHORT[p.weekday]}, ${datePart}`;
}

export function startOfLocalDay(date: Date, timeZone: string): Date {
  const p = zonedParts(date, timeZone);
  return new Date(localToUtcIso(p.year, p.month, p.day, 0, 0, timeZone));
}

export function addLocalDays(
  date: Date,
  days: number,
  timeZone: string,
): Date {
  const p = zonedParts(date, timeZone);
  // Move via UTC noon to avoid DST edge issues when adding days.
  const noon = new Date(
    localToUtcIso(p.year, p.month, p.day, 12, 0, timeZone),
  );
  noon.setUTCDate(noon.getUTCDate() + days);
  const np = zonedParts(noon, timeZone);
  return new Date(localToUtcIso(np.year, np.month, np.day, 0, 0, timeZone));
}
