import { listActiveStarts } from "../db/bookings.js";
import type { MasterProfileRow } from "../db/types.js";
import { windowsFor } from "../lib/workingHours.js";
import {
  addLocalDays,
  formatDateShort,
  formatDayLabel,
  formatTime,
  localToUtcIso,
  startOfLocalDay,
  zonedParts,
} from "./time.js";

export type GeneratedSlot = {
  id: string;
  startsAt: string;
  dayLabel: string;
  date: string;
  time: string;
  available: boolean;
};

export { windowsFor };

export type SlotProfileInput = Pick<
  MasterProfileRow,
  "schedule" | "timezone" | "duration" | "working_hours" | "day_break_min"
>;

/** Pure slot generation (busy set injected) — unit-testable without DB. */
export function generateSlotsFromBusy(
  profile: SlotProfileInput,
  busy: Set<string>,
  days = 7,
  nowMs = Date.now(),
): GeneratedSlot[] {
  const tz = profile.timezone;
  const todayStart = startOfLocalDay(new Date(nowMs), tz);
  const slots: GeneratedSlot[] = [];
  const stepMin = profile.duration;
  const dayBreak =
    profile.day_break_min != null && profile.day_break_min > 0
      ? profile.day_break_min
      : 0;

  for (let d = 0; d < days; d++) {
    const dayStart = addLocalDays(todayStart, d, tz);
    const parts = zonedParts(dayStart, tz);
    const window = windowsFor(
      profile.schedule,
      parts.weekday,
      profile.working_hours,
    );
    if (!window) continue;

    for (
      let mins = window.startMin;
      mins + stepMin <= window.endMin;
      mins += stepMin + dayBreak
    ) {
      const hour = Math.floor(mins / 60);
      const minute = mins % 60;
      const startsAt = localToUtcIso(
        parts.year,
        parts.month,
        parts.day,
        hour,
        minute,
        tz,
      );
      if (new Date(startsAt).getTime() <= nowMs) continue;

      slots.push({
        id: startsAt,
        startsAt,
        dayLabel: formatDayLabel(startsAt, tz),
        date: formatDateShort(startsAt, tz),
        time: formatTime(startsAt, tz),
        available: !busy.has(startsAt),
      });
    }
  }

  return slots;
}

export async function generateSlots(
  profile: MasterProfileRow,
  days = 7,
): Promise<GeneratedSlot[]> {
  const tz = profile.timezone;
  const todayStart = startOfLocalDay(new Date(), tz);
  const rangeEnd = addLocalDays(todayStart, days, tz);
  const busy = await listActiveStarts(
    profile.user_id,
    todayStart.toISOString(),
    rangeEnd.toISOString(),
  );
  return generateSlotsFromBusy(profile, busy, days);
}
