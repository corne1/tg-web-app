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
  /** Total booking length (services + breaks). When set, starts step every 30 min. */
  durationMin?: number,
): GeneratedSlot[] {
  const tz = profile.timezone;
  const todayStart = startOfLocalDay(new Date(nowMs), tz);
  const slots: GeneratedSlot[] = [];
  const needMin =
    durationMin != null && durationMin > 0 ? durationMin : profile.duration;
  const customDuration = durationMin != null && durationMin > 0;
  const stepMin = customDuration ? 30 : profile.duration;
  const dayBreak =
    !customDuration &&
    profile.day_break_min != null &&
    profile.day_break_min > 0
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
      mins + needMin <= window.endMin;
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
  durationMin?: number,
): Promise<GeneratedSlot[]> {
  const tz = profile.timezone;
  const todayStart = startOfLocalDay(new Date(), tz);
  const rangeEnd = addLocalDays(todayStart, days, tz);
  const busy = await listActiveStarts(
    profile.user_id,
    todayStart.toISOString(),
    rangeEnd.toISOString(),
  );
  return generateSlotsFromBusy(profile, busy, days, Date.now(), durationMin);
}
