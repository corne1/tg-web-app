/**
 * Pure cancel/reschedule window checks (minutes/hours before start).
 * Used by db/bookings and unit tests.
 */

export function hoursUntil(startsAtIso: string, now = new Date()): number {
  return (new Date(startsAtIso).getTime() - now.getTime()) / (1000 * 60 * 60);
}

/** Client must cancel at least `cancelHours` before start; master may always cancel. */
export function canCancelBooking(input: {
  startsAt: string;
  cancelHours: number;
  actorIsClient: boolean;
  /** When false, client cannot cancel (master setting). */
  enabled?: boolean;
  now?: Date;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.actorIsClient) return { ok: true };
  if (input.enabled === false) {
    return { ok: false, reason: "Client cancel disabled" };
  }
  const left = hoursUntil(input.startsAt, input.now);
  if (left < input.cancelHours) {
    return {
      ok: false,
      reason: `Cancel at least ${input.cancelHours}h before the session`,
    };
  }
  return { ok: true };
}

export function canRescheduleBooking(input: {
  startsAt: string;
  cancelHours: number;
  /** When false, client cannot reschedule (master setting). */
  enabled?: boolean;
  now?: Date;
}): { ok: true } | { ok: false; reason: string } {
  if (input.enabled === false) {
    return { ok: false, reason: "Client reschedule disabled" };
  }
  const left = hoursUntil(input.startsAt, input.now);
  if (left < input.cancelHours) {
    return {
      ok: false,
      reason: `Reschedule at least ${input.cancelHours}h before the session`,
    };
  }
  return { ok: true };
}
