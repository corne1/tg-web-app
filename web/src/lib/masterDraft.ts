export type MasterSpecialty =
  | "manicure"
  | "brows"
  | "lashes"
  | "hair"
  | "makeup";

export type PriceMode = "fixed" | "from";

export type MasterService = {
  id: string;
  title: string;
  durationMin: number;
  price: number;
  /** Upper bound for `priceMode: "from"` (Figma «до»). Optional until API supports it. */
  priceTo?: number | null;
  priceMode: PriceMode;
  breakAfterMin: number;
  description: string;
};

export type WeekdayId =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

export type DayHours = {
  enabled: boolean;
  start: string;
  end: string;
};

export type WorkingHours = Record<WeekdayId, DayHours>;

export type HoursPresetId = "mon-fri" | "mon-sat" | "everyday" | "manual";

export type PlaceMode = "studio" | "visit" | "both";

/** When to show studio street address to clients (Figma step 4). */
export type AddressVisibility = "public" | "after_booking";

export type PlaceDetails = {
  city: string;
  address: string;
  /** Studio: how to find entrance. Visit: travel districts. */
  comment: string;
  addressVisibility: AddressVisibility;
};

export type MasterDraft = {
  name: string;
  specialty: MasterSpecialty | null;
  city: string;
  services: MasterService[];
  hours: WorkingHours;
  hoursPreset: HoursPresetId | null;
  dayBreakMin: number | null;
  placeMode: PlaceMode | null;
  studioPlace: PlaceDetails;
  visitPlace: PlaceDetails;
};

const KEY = "masterSetupDraft";

export const SPECIALTIES: {
  id: MasterSpecialty;
  label: string;
  title: string;
}[] = [
  { id: "manicure", label: "Маникюр", title: "мастер маникюра" },
  { id: "brows", label: "Брови", title: "мастер бровей" },
  { id: "lashes", label: "Ресницы", title: "мастер ресниц" },
  { id: "hair", label: "Волосы", title: "мастер по волосам" },
  { id: "makeup", label: "Макияж", title: "визажист" },
];

export const DURATION_OPTIONS = [
  { value: 30, label: "30 минут" },
  { value: 45, label: "45 минут" },
  { value: 60, label: "1 час" },
  { value: 90, label: "1 ч 30 мин" },
  { value: 120, label: "2 часа" },
  /** Sentinel: opens custom duration sheet («Выбрать другое время»). */
  { value: -1, label: "Выбрать другое время" },
] as const;

export const BREAK_OPTIONS = [
  { value: 0, label: "Без перерыва" },
  { value: 5, label: "5 мин" },
  { value: 10, label: "10 мин" },
  { value: 15, label: "15 мин" },
  { value: 20, label: "20 мин" },
  { value: 30, label: "30 мин" },
  /** Sentinel: custom minutes via «Выбрать другое время» (Blur #3). */
  { value: -1, label: "Выбрать другое время" },
] as const;

export const MAX_BREAK_AFTER_MIN = 240;
export const MAX_SERVICE_PRICE = 10_000_000;

export const WEEKDAYS: { id: WeekdayId; label: string; short: string }[] = [
  { id: "mon", label: "Понедельник", short: "Пн" },
  { id: "tue", label: "Вторник", short: "Вт" },
  { id: "wed", label: "Среда", short: "Ср" },
  { id: "thu", label: "Четверг", short: "Чт" },
  { id: "fri", label: "Пятница", short: "Пт" },
  { id: "sat", label: "Суббота", short: "Сб" },
  { id: "sun", label: "Воскресенье", short: "Вс" },
];

export const HOURS_PRESETS: {
  id: Exclude<HoursPresetId, "manual">;
  title: string;
  subtitle: string;
  start: string;
  end: string;
  enabled: WeekdayId[];
}[] = [
  {
    id: "mon-fri",
    title: "Пн–Пт",
    subtitle: "10:00–19:00 · суббота и воскресенье — выходные",
    start: "10:00",
    end: "19:00",
    enabled: ["mon", "tue", "wed", "thu", "fri"],
  },
  {
    id: "mon-sat",
    title: "Пн–Сб",
    subtitle: "10:00–20:00 · воскресенье — выходной",
    start: "10:00",
    end: "20:00",
    enabled: ["mon", "tue", "wed", "thu", "fri", "sat"],
  },
  {
    id: "everyday",
    title: "Каждый день",
    subtitle: "10:00–22:00 ежедневно",
    start: "10:00",
    end: "22:00",
    enabled: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  },
];

export const DAY_BREAK_OPTIONS = [
  { value: null, label: "Не задан" },
  { value: 30, label: "30 мин" },
  { value: 45, label: "45 мин" },
  { value: 60, label: "1 ч" },
  { value: 90, label: "1 ч 30 мин" },
  { value: 120, label: "2 ч" },
] as const;

export function defaultWorkingHours(): WorkingHours {
  const hours = {} as WorkingHours;
  for (const day of WEEKDAYS) {
    const isWeekday = day.id !== "sat" && day.id !== "sun";
    hours[day.id] = {
      enabled: isWeekday,
      start: "10:00",
      end: "18:00",
    };
  }
  return hours;
}

export function applyHoursPreset(
  presetId: Exclude<HoursPresetId, "manual">,
): WorkingHours {
  const preset = HOURS_PRESETS.find((p) => p.id === presetId)!;
  const hours = {} as WorkingHours;
  for (const day of WEEKDAYS) {
    const enabled = preset.enabled.includes(day.id);
    hours[day.id] = {
      enabled,
      start: preset.start,
      end: preset.end,
    };
  }
  return hours;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Half-hour slots from 06:00 to 23:30. */
export function timeOptions(stepMin = 30): string[] {
  const out: string[] = [];
  for (let m = 6 * 60; m <= 23 * 60 + 30; m += stepMin) {
    out.push(minutesToTime(m));
  }
  return out;
}

export function hasEnabledWorkingDay(hours: WorkingHours): boolean {
  return WEEKDAYS.some((d) => hours[d.id].enabled);
}

export function normalizeWorkingHours(
  raw: Partial<WorkingHours> | undefined,
): WorkingHours {
  const base = defaultWorkingHours();
  if (!raw || typeof raw !== "object") return base;
  for (const day of WEEKDAYS) {
    const row = raw[day.id];
    if (!row) continue;
    base[day.id] = {
      enabled: Boolean(row.enabled),
      start: typeof row.start === "string" ? row.start : base[day.id].start,
      end: typeof row.end === "string" ? row.end : base[day.id].end,
    };
  }
  return base;
}

export function specialtyMeta(id: MasterSpecialty | null) {
  return SPECIALTIES.find((s) => s.id === id) ?? null;
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} мин`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

export function formatPrice(
  service: Pick<MasterService, "price" | "priceMode" | "priceTo">,
): string {
  const n = service.price.toLocaleString("ru-RU");
  if (service.priceMode !== "from") return `${n} ₽`;
  const to = service.priceTo;
  if (to != null && Number.isFinite(to) && to > 0) {
    return `от ${n} до ${to.toLocaleString("ru-RU")} ₽`;
  }
  return `от ${n} ₽`;
}

export function serviceInitials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function normalizeService(raw: Partial<MasterService> & { id?: string }): MasterService {
  const priceToRaw = raw.priceTo;
  const priceToNum = priceToRaw == null ? null : Number(priceToRaw);
  return {
    id: raw.id ?? crypto.randomUUID(),
    title: String(raw.title ?? ""),
    durationMin: Number(raw.durationMin) || 60,
    price: Number(raw.price) || 0,
    priceTo:
      priceToNum != null && Number.isFinite(priceToNum) && priceToNum > 0
        ? priceToNum
        : null,
    priceMode: raw.priceMode === "from" ? "from" : "fixed",
    breakAfterMin: Number(raw.breakAfterMin) || 0,
    description: String(raw.description ?? ""),
  };
}

export const PLACE_OPTIONS: {
  id: PlaceMode;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "studio",
    title: "В кабинете или студии",
    subtitle: "Клиенты приходят ко мне",
  },
  {
    id: "visit",
    title: "С выездом к клиенту",
    subtitle: "Я приезжаю к клиентам",
  },
  {
    id: "both",
    title: "Оба варианта",
    subtitle: "Принимаю у себя и выезжаю",
  },
];

const emptyPlace = (): PlaceDetails => ({
  city: "",
  address: "",
  comment: "",
  addressVisibility: "public",
});

const emptyDraft = (): MasterDraft => ({
  name: "",
  specialty: null,
  city: "Москва",
  services: [],
  hours: applyHoursPreset("mon-fri"),
  hoursPreset: "mon-fri",
  dayBreakMin: null,
  placeMode: null,
  studioPlace: emptyPlace(),
  visitPlace: emptyPlace(),
});

function normalizePlace(raw: Partial<PlaceDetails> | undefined): PlaceDetails {
  return {
    city: String(raw?.city ?? ""),
    address: String(raw?.address ?? ""),
    comment: String(raw?.comment ?? ""),
    addressVisibility:
      raw?.addressVisibility === "after_booking" ? "after_booking" : "public",
  };
}

export function loadMasterDraft(): MasterDraft {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as Partial<MasterDraft>;
    const hoursPreset =
      parsed.hoursPreset === "mon-fri" ||
      parsed.hoursPreset === "mon-sat" ||
      parsed.hoursPreset === "everyday" ||
      parsed.hoursPreset === "manual"
        ? parsed.hoursPreset
        : "mon-fri";
    const placeMode =
      parsed.placeMode === "studio" ||
      parsed.placeMode === "visit" ||
      parsed.placeMode === "both"
        ? parsed.placeMode
        : null;
    return {
      ...emptyDraft(),
      ...parsed,
      services: Array.isArray(parsed.services)
        ? parsed.services.map((s) => normalizeService(s))
        : [],
      hours: normalizeWorkingHours(parsed.hours),
      hoursPreset,
      dayBreakMin:
        typeof parsed.dayBreakMin === "number" ? parsed.dayBreakMin : null,
      placeMode,
      studioPlace: normalizePlace(parsed.studioPlace),
      visitPlace: normalizePlace(parsed.visitPlace),
    };
  } catch {
    return emptyDraft();
  }
}

export function saveMasterDraft(draft: MasterDraft): void {
  localStorage.setItem(KEY, JSON.stringify(draft));
}

export function clearMasterDraft(): void {
  localStorage.removeItem(KEY);
}

/** Step 1 done: identity filled. */
export function isMasterStep1Done(draft = loadMasterDraft()): boolean {
  return Boolean(draft.name.trim() && draft.specialty);
}

export function needsStudioPlace(mode: PlaceMode | null): boolean {
  return mode === "studio" || mode === "both";
}

export function needsVisitPlace(mode: PlaceMode | null): boolean {
  return mode === "visit" || mode === "both";
}

export function isPlaceDetailsValid(
  place: PlaceDetails,
  requireAddress: boolean,
): boolean {
  if (!place.city.trim()) return false;
  if (requireAddress && !place.address.trim()) return false;
  return true;
}

export function isMasterPlaceDone(draft = loadMasterDraft()): boolean {
  if (!draft.placeMode) return false;
  if (
    needsStudioPlace(draft.placeMode) &&
    !isPlaceDetailsValid(draft.studioPlace, true)
  ) {
    return false;
  }
  if (
    needsVisitPlace(draft.placeMode) &&
    !isPlaceDetailsValid(draft.visitPlace, false)
  ) {
    return false;
  }
  return true;
}

/** Ready for cabinet: identity + services + hours day + place. */
export function isMasterReady(draft = loadMasterDraft()): boolean {
  return (
    isMasterStep1Done(draft) &&
    draft.services.length > 0 &&
    hasEnabledWorkingDay(draft.hours) &&
    isMasterPlaceDone(draft)
  );
}

export function upsertService(service: MasterService): MasterDraft {
  const draft = loadMasterDraft();
  const idx = draft.services.findIndex((s) => s.id === service.id);
  if (idx >= 0) draft.services[idx] = service;
  else draft.services.push(service);
  saveMasterDraft(draft);
  return draft;
}

export function removeService(id: string): MasterDraft {
  const draft = loadMasterDraft();
  draft.services = draft.services.filter((s) => s.id !== id);
  saveMasterDraft(draft);
  return draft;
}

export function getService(id: string): MasterService | null {
  return loadMasterDraft().services.find((s) => s.id === id) ?? null;
}
