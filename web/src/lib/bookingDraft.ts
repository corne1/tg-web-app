import { type BookingClient } from "./bookingClients";
import {
  formatDuration,
  formatPrice,
  loadMasterDraft,
  WEEKDAYS,
  type MasterService,
  type WorkingHours,
} from "./masterDraft";
import { weekdayIdFromDate, workDayRange } from "./scheduleUi";

export type BookingDraft = {
  clientId: string | null;
  /** Snapshot of selected client from API (no mock catalog). */
  client: BookingClient | null;
  serviceIds: string[];
  dateISO: string | null;
  time: string | null;
};

const DRAFT_KEY = "pomni.bookingDraft.v1";

export function selectedServicesLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = "услуг";
  if (mod10 === 1 && mod100 !== 11) word = "услуга";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    word = "услуги";
  return `Выбрано: ${count} ${word}`;
}

export function serviceLetter(title: string): string {
  return (title.trim().charAt(0) || "?").toUpperCase();
}

export function emptyBookingDraft(): BookingDraft {
  return {
    clientId: null,
    client: null,
    serviceIds: [],
    dateISO: null,
    time: null,
  };
}

function parseClientSnapshot(raw: unknown): BookingClient | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<BookingClient>;
  if (!c.id || !c.name) return null;
  return {
    id: String(c.id),
    name: String(c.name),
    phone: String(c.phone ?? ""),
    visits: Number(c.visits ?? 0),
    lastVisitLabel: c.lastVisitLabel ?? null,
    lastVisitAt: c.lastVisitAt ?? null,
    avatarTone: c.avatarTone ?? "violet",
    notes: Array.isArray(c.notes) ? c.notes : [],
    clientSinceLabel: c.clientSinceLabel ?? null,
    nextBooking: c.nextBooking ?? null,
    history: Array.isArray(c.history) ? c.history : [],
  };
}

export function readBookingDraft(): BookingDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyBookingDraft();
    const parsed = JSON.parse(raw) as Partial<BookingDraft>;
    const client = parseClientSnapshot(parsed.client);
    return {
      clientId: parsed.clientId ?? client?.id ?? null,
      client,
      serviceIds: Array.isArray(parsed.serviceIds) ? parsed.serviceIds : [],
      dateISO: parsed.dateISO ?? null,
      time: parsed.time ?? null,
    };
  } catch {
    return emptyBookingDraft();
  }
}

export function writeBookingDraft(draft: BookingDraft): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function patchBookingDraft(patch: Partial<BookingDraft>): BookingDraft {
  const next = { ...readBookingDraft(), ...patch };
  writeBookingDraft(next);
  return next;
}

export function resolveBookingClient(
  clientId: string | null,
  draft = readBookingDraft(),
): BookingClient | null {
  if (!clientId) return null;
  if (draft.client && draft.client.id === clientId) return draft.client;
  return null;
}

/** Services from master draft (synced from DB via /api/master). Empty if none. */
export function bookingCatalogServices(): MasterService[] {
  return loadMasterDraft().services;
}

export function resolveBookingServices(ids: string[]): MasterService[] {
  const catalog = bookingCatalogServices();
  return ids
    .map((id) => catalog.find((s) => s.id === id))
    .filter((s): s is MasterService => Boolean(s));
}

export function bookingTotals(services: MasterService[]): {
  serviceMin: number;
  breakMin: number;
  totalMin: number;
  priceLabel: string;
  titles: string;
} {
  const serviceMin = services.reduce((sum, s) => sum + s.durationMin, 0);
  const breakMin = services.reduce((sum, s) => sum + (s.breakAfterMin || 0), 0);
  const totalMin = serviceMin + breakMin;
  const priceSum = services.reduce((sum, s) => sum + s.price, 0);
  const anyFrom = services.some((s) => s.priceMode === "from");
  return {
    serviceMin,
    breakMin,
    totalMin,
    priceLabel: anyFrom ? `от ${priceSum} ₽` : `${priceSum} ₽`,
    titles: services.map((s) => s.title).join(" · "),
  };
}

export { formatDuration, formatPrice };

export function dateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatBookingDayTitle(date: Date): string {
  const wd = WEEKDAYS.find((w) => w.id === weekdayIdFromDate(date));
  const months = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} · ${wd?.label ?? ""}`;
}

function hmToMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function minToHm(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const FALLBACK_HOURS: WorkingHours = {
  mon: { enabled: true, start: "09:00", end: "21:00" },
  tue: { enabled: true, start: "09:00", end: "21:00" },
  wed: { enabled: true, start: "09:00", end: "21:00" },
  thu: { enabled: true, start: "09:00", end: "21:00" },
  fri: { enabled: true, start: "09:00", end: "21:00" },
  sat: { enabled: true, start: "10:00", end: "18:00" },
  sun: { enabled: false, start: "10:00", end: "18:00" },
};

/** Generate free start times for a day given working hours + needed duration. */
export function generateDaySlots(
  date: Date,
  hours: WorkingHours | null | undefined,
  durationMin: number,
  stepMin = 30,
): string[] {
  const effective = hours ?? FALLBACK_HOURS;
  const range = workDayRange(date, effective);
  if (!range || durationMin <= 0) return [];
  const start = hmToMin(range.start);
  const end = hmToMin(range.end);
  const lastStart = end - durationMin;
  if (lastStart < start) return [];
  const slots: string[] = [];
  for (let t = start; t <= lastStart; t += stepMin) {
    slots.push(minToHm(t));
  }
  return slots;
}

export function groupSlots(slots: string[]): { label: string; times: string[] }[] {
  const morning = slots.filter((t) => hmToMin(t) < 12 * 60);
  const day = slots.filter((t) => {
    const m = hmToMin(t);
    return m >= 12 * 60 && m < 17 * 60;
  });
  const evening = slots.filter((t) => hmToMin(t) >= 17 * 60);
  const groups: { label: string; times: string[] }[] = [];
  if (morning.length) groups.push({ label: "Утро", times: morning });
  if (day.length) groups.push({ label: "День", times: day });
  if (evening.length) groups.push({ label: "Вечер", times: evening });
  return groups;
}
