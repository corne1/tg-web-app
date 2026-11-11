/** Active booking occupancy for slot / conflict checks. */
export type BusyInterval = {
  id?: string;
  startsAt: string;
  durationMin: number;
};

export function bookingEndMs(startsAt: string, durationMin: number): number {
  return (
    Date.parse(startsAt) + Math.max(1, durationMin) * 60_000
  );
}

/** Half-open intervals [start, end) overlap. */
export function intervalsOverlap(
  aStartMs: number,
  aEndMs: number,
  bStartMs: number,
  bEndMs: number,
): boolean {
  return aStartMs < bEndMs && aEndMs > bStartMs;
}

export function slotConflictsWithBusy(
  startsAt: string,
  durationMin: number,
  busy: BusyInterval[],
  opts?: { excludeBookingId?: string },
): boolean {
  const startMs = Date.parse(startsAt);
  if (!Number.isFinite(startMs)) return true;
  const endMs = bookingEndMs(startsAt, durationMin);
  const excludeId = opts?.excludeBookingId;
  for (const b of busy) {
    if (excludeId && b.id === excludeId) continue;
    const bStart = Date.parse(b.startsAt);
    if (!Number.isFinite(bStart)) continue;
    const bEnd = bookingEndMs(b.startsAt, b.durationMin);
    if (intervalsOverlap(startMs, endMs, bStart, bEnd)) return true;
  }
  return false;
}
