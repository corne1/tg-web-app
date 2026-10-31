import type { DayHours, WeekdayId, WorkingHours } from "./masterDraft";

export function toggleWorkingDay(
  hours: WorkingHours,
  id: WeekdayId,
): WorkingHours {
  return {
    ...hours,
    [id]: { ...hours[id], enabled: !hours[id].enabled },
  };
}

export function updateWorkingDayTime(
  hours: WorkingHours,
  id: WeekdayId,
  patch: Partial<DayHours>,
): WorkingHours {
  return {
    ...hours,
    [id]: { ...hours[id], ...patch },
  };
}

export function copyHoursToDays(
  hours: WorkingHours,
  sourceId: WeekdayId,
  targets: WeekdayId[],
): WorkingHours {
  const source = hours[sourceId];
  const next = { ...hours };
  for (const id of targets) {
    next[id] = {
      enabled: true,
      start: source.start,
      end: source.end,
    };
  }
  return next;
}
