import {
  loadMasterDraft,
  normalizeScheduleBreak,
  normalizeWorkingHours,
  saveMasterDraft,
  type ServiceTypeCode,
} from "./masterDraft";
import type { MasterProfile, MasterServiceDto } from "../types";

export function syncDraftFromServer(
  profile: MasterProfile | null,
  services: MasterServiceDto[],
) {
  if (!profile) return;
  const prev = loadMasterDraft();
  const place = profile.place;
  saveMasterDraft({
    ...prev,
    name: profile.name,
    serviceTypeCode:
      (profile.serviceTypeCode as ServiceTypeCode | null) ?? null,
    city: profile.city ?? "Москва",
    hours: profile.workingHours
      ? normalizeWorkingHours(profile.workingHours)
      : prev.hours,
    dayBreakMin:
      profile.dayBreakMin !== undefined
        ? profile.dayBreakMin
        : prev.dayBreakMin,
    scheduleBreak: profile.scheduleBreak
      ? normalizeScheduleBreak(profile.scheduleBreak)
      : prev.scheduleBreak,
    placeMode: place?.mode ?? prev.placeMode,
    studioPlace: place
      ? {
          city: place.studio.city,
          address: place.studio.address,
          comment: place.studio.comment,
          addressVisibility: place.studio.addressVisibility,
        }
      : prev.studioPlace,
    visitPlace: place
      ? {
          city: place.visit.city,
          address: "",
          comment: place.visit.areas,
          addressVisibility: "public" as const,
        }
      : prev.visitPlace,
    services: services.map((s) => ({
      id: s.id,
      title: s.title,
      durationMin: s.durationMin,
      price: s.price,
      priceMode: s.priceMode,
      breakAfterMin: s.breakAfterMin,
      description: s.description,
    })),
  });
}
