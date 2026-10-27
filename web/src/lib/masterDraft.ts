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
  priceMode: PriceMode;
  breakAfterMin: number;
  description: string;
};

export type MasterDraft = {
  name: string;
  specialty: MasterSpecialty | null;
  city: string;
  services: MasterService[];
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
  { value: 30, label: "30 мин" },
  { value: 45, label: "45 мин" },
  { value: 60, label: "1 ч" },
  { value: 90, label: "1 ч 30 мин" },
  { value: 120, label: "2 ч" },
  { value: -1, label: "Своя длительность" },
] as const;

export const BREAK_OPTIONS = [
  { value: 0, label: "Без перерыва" },
  { value: 5, label: "5 мин" },
  { value: 10, label: "10 мин" },
  { value: 15, label: "15 мин" },
  { value: 30, label: "30 мин" },
  { value: 45, label: "45 мин" },
  { value: 60, label: "1 ч" },
] as const;

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

export function formatPrice(service: Pick<MasterService, "price" | "priceMode">): string {
  const n = service.price.toLocaleString("ru-RU");
  return service.priceMode === "from" ? `от ${n} ₽` : `${n} ₽`;
}

export function serviceInitials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function normalizeService(raw: Partial<MasterService> & { id?: string }): MasterService {
  return {
    id: raw.id ?? crypto.randomUUID(),
    title: String(raw.title ?? ""),
    durationMin: Number(raw.durationMin) || 60,
    price: Number(raw.price) || 0,
    priceMode: raw.priceMode === "from" ? "from" : "fixed",
    breakAfterMin: Number(raw.breakAfterMin) || 0,
    description: String(raw.description ?? ""),
  };
}

const emptyDraft = (): MasterDraft => ({
  name: "",
  specialty: null,
  city: "Москва",
  services: [],
});

export function loadMasterDraft(): MasterDraft {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as Partial<MasterDraft>;
    return {
      ...emptyDraft(),
      ...parsed,
      services: Array.isArray(parsed.services)
        ? parsed.services.map((s) => normalizeService(s))
        : [],
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
