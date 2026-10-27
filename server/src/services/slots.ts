import { listActiveStarts } from "../db/bookings.js";
import type { PsychologistProfileRow, ScheduleKind } from "../db/types.js";
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

type DayWindow = { startHour: number; endHour: number };

function windowsFor(
  schedule: ScheduleKind,
  weekday: number,
): DayWindow | null {
  // weekday: 0=Sun … 6=Sat
  if (schedule === "weekend") {
    if (weekday === 0 || weekday === 6) {
      return { startHour: 12, endHour: 18 };
    }
    return null;
  }
  // weekday + manual (MVP): Mon–Fri 10–20
  if (weekday >= 1 && weekday <= 5) {
    return { startHour: 10, endHour: 20 };
  }
  return null;
}

export async function generateSlots(
  profile: PsychologistProfileRow,
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

  const slots: GeneratedSlot[] = [];
  const now = Date.now();

  for (let d = 0; d < days; d++) {
    const dayStart = addLocalDays(todayStart, d, tz);
    const parts = zonedParts(dayStart, tz);
    const window = windowsFor(profile.schedule, parts.weekday);
    if (!window) continue;

    for (
      let mins = window.startHour * 60;
      mins + profile.duration <= window.endHour * 60;
      mins += profile.duration
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
      if (new Date(startsAt).getTime() <= now) continue;

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
