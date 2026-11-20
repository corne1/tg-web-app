import {
  hasEnabledWorkingDay,
  normalizeScheduleBreak,
  normalizeWorkingHours,
  type ScheduleBreak,
  type WorkingHours,
} from "./workingHours.js";

const BOOKING_RULE_HOURS = new Set([1, 2, 6, 12, 24, 48, 72]);

type Ok<T> = { ok: true; value: T };
type Fail = { ok: false; error: string };
export type ParseResult<T> = Ok<T> | Fail;

function recordOf(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

export function readAvatarUrl(body: unknown): string | null {
  const raw = recordOf(body).avatarUrl;
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return null;
  return raw.trim() || null;
}

export function readTravelBufferMin(
  body: unknown,
): ParseResult<number | undefined> {
  const raw = recordOf(body).travelBufferMin;
  if (raw === null || raw === undefined || raw === "") {
    return { ok: true, value: undefined };
  }
  const travelBufferMin = Number(raw);
  if (
    !Number.isFinite(travelBufferMin) ||
    travelBufferMin < 0 ||
    travelBufferMin > 240
  ) {
    return { ok: false, error: "Invalid travelBufferMin" };
  }
  return { ok: true, value: travelBufferMin };
}

export function readHoursBody(body: unknown): ParseResult<{
  hours: WorkingHours;
  dayBreakMin: number | null;
  scheduleBreak: ScheduleBreak | undefined;
}> {
  const record = recordOf(body);
  const hours = normalizeWorkingHours(record.hours ?? record.workingHours);
  const dayBreakRaw = record.dayBreakMin;
  const dayBreakMin =
    dayBreakRaw === null || dayBreakRaw === undefined || dayBreakRaw === ""
      ? null
      : Number(dayBreakRaw);
  const scheduleBreak =
    record.scheduleBreak !== undefined
      ? normalizeScheduleBreak(record.scheduleBreak)
      : undefined;
  if (!hours || !hasEnabledWorkingDay(hours)) {
    return { ok: false, error: "At least one working day required" };
  }
  if (
    dayBreakMin != null &&
    (!Number.isFinite(dayBreakMin) || dayBreakMin < 0 || dayBreakMin > 240)
  ) {
    return { ok: false, error: "Invalid dayBreakMin" };
  }
  return { ok: true, value: { hours, dayBreakMin, scheduleBreak } };
}

export function readBookingRulesBody(body: unknown): ParseResult<{
  clientCancelEnabled: boolean | undefined;
  clientRescheduleEnabled: boolean | undefined;
  cancelHours: number | undefined;
  rescheduleHours: number | undefined;
}> {
  const record = recordOf(body);
  const clientCancelEnabled =
    record.clientCancelEnabled === undefined
      ? undefined
      : Boolean(record.clientCancelEnabled);
  const clientRescheduleEnabled =
    record.clientRescheduleEnabled === undefined
      ? undefined
      : Boolean(record.clientRescheduleEnabled);
  const cancelHours =
    record.cancelHours === undefined || record.cancelHours === null
      ? undefined
      : Number(record.cancelHours);
  const rescheduleHours =
    record.rescheduleHours === undefined || record.rescheduleHours === null
      ? undefined
      : Number(record.rescheduleHours);
  if (
    cancelHours !== undefined &&
    (!Number.isFinite(cancelHours) || !BOOKING_RULE_HOURS.has(cancelHours))
  ) {
    return { ok: false, error: "Invalid cancelHours" };
  }
  if (
    rescheduleHours !== undefined &&
    (!Number.isFinite(rescheduleHours) || !BOOKING_RULE_HOURS.has(rescheduleHours))
  ) {
    return { ok: false, error: "Invalid rescheduleHours" };
  }
  return {
    ok: true,
    value: {
      clientCancelEnabled,
      clientRescheduleEnabled,
      cancelHours,
      rescheduleHours,
    },
  };
}

export function readServiceBody(body: unknown): ParseResult<{
  title: string;
  durationMin: number;
  price: number;
  priceMode: "fixed" | "from";
  breakAfterMin: number;
  description: string;
}> {
  const record = recordOf(body);
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const durationMin = Number(record.durationMin);
  const price = Number(record.price);
  const priceMode = record.priceMode === "from" ? "from" : "fixed";
  const breakRaw = Number(record.breakAfterMin ?? 0);
  const description = typeof record.description === "string" ? record.description : "";
  if (!title || title.length > 120) return { ok: false, error: "Invalid title" };
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return { ok: false, error: "Invalid durationMin" };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: "Invalid price" };
  }
  return {
    ok: true,
    value: {
      title,
      durationMin,
      price,
      priceMode,
      breakAfterMin: Number.isFinite(breakRaw) ? breakRaw : 0,
      description,
    },
  };
}

export function readOnboardingStep(body: unknown): ParseResult<number> {
  const step = Number(recordOf(body).step);
  if (!Number.isFinite(step) || step < 1 || step > 4) {
    return { ok: false, error: "step must be 1..4" };
  }
  return { ok: true, value: step };
}
