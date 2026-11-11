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

const DEFAULT_SLOT_DURATION_MIN = 60;

export type SlotProfileInput = Pick<
  MasterProfileRow,
  "schedule" | "timezone" | "working_hours" | "day_break_min" | "travel_buffer_min"
>;

export type GenerateSlotsOptions = {
  /** Total booking length (services + breaks). When set, starts step every 30 min. */
  durationMin?: number;
  /**
   * Travel buffer before visit start (client still sees visit start time).
   * Slot at T requires T - buffer within the working window.
   */
  travelBufferMin?: number;
};

/** Pure slot generation (busy set injected) — unit-testable without DB. */
export function generateSlotsFromBusy(
  profile: SlotProfileInput,
  busy: Set<string>,
  days = 7,
  nowMs = Date.now(),
  durationMinOrOpts?: number | GenerateSlotsOptions,
): GeneratedSlot[] {
  const opts: GenerateSlotsOptions =
    typeof durationMinOrOpts === "number"
      ? { durationMin: durationMinOrOpts }
      : (durationMinOrOpts ?? {});
  const tz = profile.timezone;
  const todayStart = startOfLocalDay(new Date(nowMs), tz);
  const slots: GeneratedSlot[] = [];
  const needMin =
    opts.durationMin != null && opts.durationMin > 0
      ? opts.durationMin
      : DEFAULT_SLOT_DURATION_MIN;
  const customDuration = opts.durationMin != null && opts.durationMin > 0;
  const stepMin = customDuration ? 30 : DEFAULT_SLOT_DURATION_MIN;
  const dayBreak =
    !customDuration &&
    profile.day_break_min != null &&
    profile.day_break_min > 0
      ? profile.day_break_min
      : 0;
  const travelBuffer =
    opts.travelBufferMin != null && opts.travelBufferMin > 0
      ? opts.travelBufferMin
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
      if (travelBuffer > 0 && mins - travelBuffer < window.startMin) {
        continue;
      }
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
  durationMinOrOpts?: number | GenerateSlotsOptions,
): Promise<GeneratedSlot[]> {
  const tz = profile.timezone;
  const todayStart = startOfLocalDay(new Date(), tz);
  const rangeEnd = addLocalDays(todayStart, days, tz);
  const busy = await listActiveStarts(
    profile.user_id,
    todayStart.toISOString(),
    rangeEnd.toISOString(),
  );
  return generateSlotsFromBusy(
    profile,
    busy,
    days,
    Date.now(),
    durationMinOrOpts,
  );
}
