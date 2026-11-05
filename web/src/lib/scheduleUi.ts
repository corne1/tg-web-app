import type { WeekdayId, WorkingHours } from "./masterDraft";
import { WEEKDAYS } from "./masterDraft";

const MONTHS_NOM = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

export const MONTHS_GEN = [
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
] as const;

const JS_TO_WEEKDAY: WeekdayId[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export type CardTone = "amber" | "sky" | "violet" | "mint";

export const CARD_TONES: CardTone[] = ["amber", "sky", "violet", "mint"];

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday-based week start. */
export function startOfWeek(date: Date): Date {
  const day = startOfLocalDay(date);
  const jsDay = day.getDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  day.setDate(day.getDate() + diff);
  return day;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function weekdayIdFromDate(date: Date): WeekdayId {
  return JS_TO_WEEKDAY[date.getDay()];
}

export function monthTitle(date: Date): string {
  return `${MONTHS_NOM[date.getMonth()]} ${date.getFullYear()}`;
}

export function dayTitle(date: Date): string {
  const wd = WEEKDAYS.find((d) => d.id === weekdayIdFromDate(date));
  const label = wd?.label ?? "";
  return `${label}, ${date.getDate()} ${MONTHS_GEN[date.getMonth()]}`;
}

export function workDayRange(
  date: Date,
  hours: WorkingHours | null | undefined,
): { start: string; end: string } | null {
  if (!hours) return null;
  const day = hours[weekdayIdFromDate(date)];
  if (!day?.enabled) return null;
  return { start: day.start, end: day.end };
}

export function workHoursLabel(
  date: Date,
  hours: WorkingHours | null | undefined,
): string {
  if (!hours) return "Рабочее время не задано";
  const range = workDayRange(date, hours);
  if (!range) return "Выходной по графику";
  return `Рабочее время · ${range.start}–${range.end}`;
}

export function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function sessionEndClock(
  startsAt: string | undefined,
  durationMin: number,
  fallbackTime: string,
): string {
  if (!startsAt) return fallbackTime;
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return fallbackTime;
  const end = new Date(start.getTime() + durationMin * 60_000);
  return formatClock(end);
}

export function sessionStartDate(startsAt: string | undefined): Date | null {
  if (!startsAt) return null;
  const d = new Date(startsAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "Мастер";
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "М";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}
