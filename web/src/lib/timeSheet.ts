import { minutesToTime, timeOptions, timeToMinutes } from "./masterDraft";

/** Half-hour slots offered by the working-time sheet (06:00–23:30). */
export const TIME_SHEET_OPTS = timeOptions(30);

export function isTimeAllowed(
  candidate: string,
  field: "start" | "end",
  other: string,
): boolean {
  const mins = timeToMinutes(candidate);
  const otherMins = timeToMinutes(other);
  return field === "start" ? mins < otherMins : mins > otherMins;
}

/**
 * Six half-hour chips around `center`.
 * Pass the time the sheet opened with. Rebuilding the window from a newly
 * picked chip shifts every label, so the pressed time is replaced by a neighbor.
 */
export function quickTimeChoices(
  center: string,
  field: "start" | "end",
  other: string,
  opts: readonly string[] = TIME_SHEET_OPTS,
): string[] {
  const valid = opts.filter((t) => isTimeAllowed(t, field, other));
  if (valid.length === 0) return [];

  const centerMin = timeToMinutes(center);
  const window: string[] = [];
  for (let i = -2; i <= 3; i++) {
    const t = minutesToTime(centerMin + i * 30);
    if (valid.includes(t)) window.push(t);
  }
  if (window.length === 6) return window;

  return [...valid]
    .sort(
      (a, b) =>
        Math.abs(timeToMinutes(a) - centerMin) -
        Math.abs(timeToMinutes(b) - centerMin),
    )
    .slice(0, 6)
    .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}
