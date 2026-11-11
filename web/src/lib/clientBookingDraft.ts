import {
  formatDuration,
  formatPrice,
  type MasterService,
  type PriceMode,
} from "./masterDraft";
import type { MasterServiceDto, PublicMaster, PublicPlaceDto } from "../types";

export type ClientPlaceChoice = "studio" | "visit";

export type ClientBookingDraft = {
  masterKey: string;
  masterId: number | null;
  masterName: string;
  masterServiceTypeCode: string | null;
  masterAvatarUrl: string | null;
  masterCity: string;
  place: PublicPlaceDto | null;
  servicesCatalog: MasterService[];
  serviceIds: string[];
  placeChoice: ClientPlaceChoice | null;
  visitCity: string;
  visitArea: string;
  visitAddress: string;
  visitApt: string;
  visitEntrance: string;
  visitFloor: string;
  visitIntercom: string;
  visitNote: string;
  startsAt: string | null;
  dateLabel: string | null;
  timeLabel: string | null;
  clientName: string;
  comment: string;
  bookingId: string | null;
};

const DRAFT_KEY = "pomni.clientBookingDraft.v1";

export function emptyClientDraft(masterKey = ""): ClientBookingDraft {
  return {
    masterKey,
    masterId: null,
    masterName: "",
    masterServiceTypeCode: null,
    masterAvatarUrl: null,
    masterCity: "",
    place: null,
    servicesCatalog: [],
    serviceIds: [],
    placeChoice: null,
    visitCity: "",
    visitArea: "",
    visitAddress: "",
    visitApt: "",
    visitEntrance: "",
    visitFloor: "",
    visitIntercom: "",
    visitNote: "",
    startsAt: null,
    dateLabel: null,
    timeLabel: null,
    clientName: "",
    comment: "",
    bookingId: null,
  };
}

function mapService(s: MasterServiceDto): MasterService {
  return {
    id: s.id,
    title: s.title,
    durationMin: s.durationMin,
    price: s.price,
    priceMode: s.priceMode as PriceMode,
    breakAfterMin: s.breakAfterMin,
    description: s.description,
  };
}

export function hydrateFromPublicMaster(
  masterKey: string,
  master: PublicMaster,
  prev?: ClientBookingDraft | null,
): ClientBookingDraft {
  const base = prev?.masterKey === masterKey ? prev : emptyClientDraft(masterKey);
  const catalog = (master.services ?? []).map(mapService);
  const validIds = new Set(catalog.map((s) => s.id));
  return {
    ...base,
    masterKey,
    masterId: master.id,
    masterName: master.name,
    masterServiceTypeCode: master.serviceTypeCode ?? null,
    masterAvatarUrl: master.avatarUrl ?? null,
    masterCity: master.city ?? "",
    place: master.place ?? null,
    servicesCatalog: catalog,
    serviceIds: base.serviceIds.filter((id) => validIds.has(id)),
  };
}

export function readClientDraft(): ClientBookingDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyClientDraft();
    const parsed = JSON.parse(raw) as Partial<ClientBookingDraft>;
    return {
      ...emptyClientDraft(String(parsed.masterKey ?? "")),
      ...parsed,
      serviceIds: Array.isArray(parsed.serviceIds) ? parsed.serviceIds : [],
      servicesCatalog: Array.isArray(parsed.servicesCatalog)
        ? parsed.servicesCatalog
        : [],
      placeChoice:
        parsed.placeChoice === "studio" || parsed.placeChoice === "visit"
          ? parsed.placeChoice
          : null,
    };
  } catch {
    return emptyClientDraft();
  }
}

export function writeClientDraft(draft: ClientBookingDraft): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function patchClientDraft(
  patch: Partial<ClientBookingDraft>,
): ClientBookingDraft {
  const next = { ...readClientDraft(), ...patch };
  writeClientDraft(next);
  return next;
}

export function clearClientDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

export function selectedServicesLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = "услуг";
  if (mod10 === 1 && mod100 !== 11) word = "услуга";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    word = "услуги";
  return `Выбрано: ${count} ${word}`;
}

export function resolveClientServices(draft: ClientBookingDraft): MasterService[] {
  return draft.serviceIds
    .map((id) => draft.servicesCatalog.find((s) => s.id === id))
    .filter((s): s is MasterService => Boolean(s));
}

export function clientBookingTotals(services: MasterService[]): {
  totalMin: number;
  priceSum: number;
  priceLabel: string;
  titles: string;
} {
  const totalMin = services.reduce(
    (sum, s) => sum + s.durationMin + (s.breakAfterMin || 0),
    0,
  );
  const priceSum = services.reduce((sum, s) => sum + s.price, 0);
  const anyFrom = services.some((s) => s.priceMode === "from");
  return {
    totalMin,
    priceSum,
    priceLabel: anyFrom ? `от ${priceSum} ₽` : `${priceSum} ₽`,
    titles: services.map((s) => s.title).join(" · "),
  };
}

/** TZ §3 — skip place step when only one format is offered. */
export function resolveAutoPlaceChoice(
  place: PublicPlaceDto | null,
): ClientPlaceChoice | null {
  if (!place) return "studio";
  if (place.mode === "studio") return "studio";
  if (place.mode === "visit") return "visit";
  return null;
}

export function needsClientPlaceStep(place: PublicPlaceDto | null): boolean {
  return place?.mode === "both";
}

export function needsClientAddressStep(
  placeChoice: ClientPlaceChoice | null,
): boolean {
  return placeChoice === "visit";
}

export function studioAddressLine(place: PublicPlaceDto | null): string {
  const studio = place?.studio;
  if (!studio) return "";
  if (studio.addressVisible && studio.address) {
    return [studio.city, studio.address].filter(Boolean).join(", ");
  }
  if (studio.city) {
    return studio.addressHint
      ? `${studio.city}. ${studio.addressHint}`
      : studio.city;
  }
  return studio.addressHint ?? "";
}

export { formatDuration, formatPrice };
