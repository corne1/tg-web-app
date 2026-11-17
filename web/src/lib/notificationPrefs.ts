export type NotificationPrefs = {
  newBooking: boolean;
  reschedule: boolean;
  cancel: boolean;
  upcomingReminder: boolean;
};

const KEY = "pomni.notificationPrefs.v1";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  newBooking: true,
  reschedule: true,
  cancel: true,
  upcomingReminder: true,
};

export function loadNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      newBooking: parsed.newBooking !== false,
      reschedule: parsed.reschedule !== false,
      cancel: parsed.cancel !== false,
      upcomingReminder: parsed.upcomingReminder !== false,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}
