import {
  isPlaceDetailsValid,
  needsStudioPlace,
  needsVisitPlace,
  type PlaceDetails,
  type PlaceMode,
} from "./masterDraft";

export type PlaceStage = 1 | 2 | 3;

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
