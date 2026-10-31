import {
  isPlaceDetailsValid,
  needsStudioPlace,
  needsVisitPlace,
  WEEKDAYS,
  type AddressVisibility,
  type MasterDraft,
  type PlaceDetails,
  type PlaceMode,
  type WorkingHours,
} from "./masterDraft";
import type { MasterPlaceDto } from "../types";

/** Collapsed service list length on publish review (Этап 3). */
export const REVIEW_SERVICES_PREVIEW = 3;

export type PlaceStage = 1 | 2 | 3;

export type PlaceStage2Copy = {
  title: string;
  lead: string;
};

export function placeStage2Copy(mode: PlaceMode): PlaceStage2Copy {
  if (mode === "visit") {
    return {
      title: "В каких районах вы выезжаете?",
      lead: "Укажите город и районы, в которых вы готовы принимать записи с выездом",
    };
  }
  if (mode === "both") {
    return {
      title: "Где вы принимаете и куда выезжаете?",
      lead: "Укажите адрес, по которому клиенты смогут прийти на услугу",
    };
  }
  return {
    title: "Где вы принимаете клиентов?",
    lead: "Укажите адрес, по которому принимаете клиентов, и районы, в которые готовы выезжать",
  };
}

export function canContinuePlaceStage1(placeMode: PlaceMode | null): boolean {
  return Boolean(placeMode);
}

export function canContinuePlaceStage2(
  placeMode: PlaceMode | null,
  studioPlace: PlaceDetails,
  visitPlace: PlaceDetails,
): boolean {
  if (!placeMode) return false;
  if (needsStudioPlace(placeMode) && !isPlaceDetailsValid(studioPlace, true)) {
    return false;
  }
  if (needsVisitPlace(placeMode) && !isPlaceDetailsValid(visitPlace, false)) {
    return false;
  }
  return true;
}

export function nextPlaceStage(stage: PlaceStage): PlaceStage {
  if (stage === 1) return 2;
  if (stage === 2) return 3;
  return 3;
}

export function prevPlaceStage(stage: PlaceStage): PlaceStage {
  if (stage === 3) return 2;
  if (stage === 2) return 1;
  return 1;
}

export function deriveDraftCity(
  studioPlace: PlaceDetails,
  visitPlace: PlaceDetails,
  fallback: string,
): string {
  return (
    studioPlace.city.trim() ||
    visitPlace.city.trim() ||
    fallback ||
    "Москва"
  );
}

export function draftToPlaceDto(draft: MasterDraft): MasterPlaceDto | null {
  if (!draft.placeMode) return null;
  return {
    mode: draft.placeMode,
    studio: {
      city: draft.studioPlace.city.trim(),
      address: draft.studioPlace.address.trim(),
      comment: draft.studioPlace.comment.trim(),
      addressVisibility: draft.studioPlace.addressVisibility,
    },
    visit: {
      city: draft.visitPlace.city.trim(),
      areas: draft.visitPlace.comment.trim(),
    },
  };
}

export const ADDRESS_VISIBILITY_OPTIONS: {
  id: AddressVisibility;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "public",
    title: "В публичном профиле",
    subtitle: "Клиенты видят адрес до записи",
  },
  {
    id: "after_booking",
    title: "После подтверждения записи",
    subtitle: "До записи виден только город",
  },
];

export type ReviewHourRow = {
  dayId: string;
  label: string;
  range: string;
};

/** Enabled weekdays with `HH:MM–HH:MM` for the publish review checklist. */
export function reviewWorkingDayRows(hours: WorkingHours): ReviewHourRow[] {
  return WEEKDAYS.filter((d) => hours[d.id]?.enabled).map((d) => {
    const row = hours[d.id];
    return {
      dayId: d.id,
      label: d.label,
      range: `${row.start}–${row.end}`,
    };
  });
}

/** Short labels of days off, e.g. `Вт, Пт, Вс`. */
export function reviewDaysOffShort(hours: WorkingHours): string {
  return WEEKDAYS.filter((d) => !hours[d.id]?.enabled)
    .map((d) => d.short)
    .join(", ");
}

/** Client-facing note under place details on the review screen. */
export function reviewAddressVisibilityNote(
  visibility: AddressVisibility,
): string {
  if (visibility === "after_booking") {
    return "Точный адрес виден после подтверждения записи";
  }
  return "Точный адрес виден в публичном профиле";
}

export function formatStudioAddressLine(place: PlaceDetails): string {
  const city = place.city.trim();
  const address = place.address.trim();
  if (city && address) return `${city}, ${address}`;
  return city || address;
}
