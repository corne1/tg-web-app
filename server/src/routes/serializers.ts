import { bookingDeepLink, masterDeepLink } from "../config.js";
import { listServices } from "../db/services.js";
import type { MasterProfileRow } from "../db/types.js";
import type { WorkingHours } from "../lib/workingHours.js";

export function serializeProfile(profile: MasterProfileRow) {
  const onboardingComplete =
    profile.status === "active" && Boolean(profile.onboarding_completed_at);
  return {
    userId: profile.user_id,
    slug: profile.slug,
    name: profile.name,
    schedule: profile.schedule,
    timezone: profile.timezone,
    cancelHours: profile.cancel_hours,
    serviceTypeCode: profile.service_type_code,
    city: profile.city,
    status: profile.status,
    onboardingStep: profile.onboarding_step,
    onboardingComplete,
    onboardingCompletedAt: profile.onboarding_completed_at,
    workingHours: profile.working_hours,
    dayBreakMin: profile.day_break_min,
    travelBufferMin: profile.travel_buffer_min,
    place: profile.place,
    avatarUrl: profile.avatar_url,
    about: profile.about_text,
    bookingLink:
      bookingDeepLink(profile.slug) ?? masterDeepLink(profile.user_id),
  };
}

export function serializeService(
  row: Awaited<ReturnType<typeof listServices>>[number],
) {
  return {
    id: row.id,
    title: row.title,
    durationMin: row.duration_min,
    price: row.price,
    priceMode: row.price_mode,
    breakAfterMin: row.break_after_min,
    description: row.description,
    serviceTypeCode: row.service_type_code,
  };
}

/** Public place payload — studio address redacted when visibility is after_booking. */
export function serializePublicPlace(profile: MasterProfileRow) {
  const place = profile.place;
  if (!place) return null;
  const studioVisible = place.studio.addressVisibility === "public";
  const showStudio =
    place.mode === "studio" || place.mode === "both";
  const showVisit = place.mode === "visit" || place.mode === "both";
  return {
    mode: place.mode,
    studio: showStudio
      ? {
          city: place.studio.city,
          address: studioVisible ? place.studio.address : "",
          addressVisible: studioVisible,
          addressHint: studioVisible
            ? null
            : "Точный адрес появится после оформления записи",
        }
      : null,
    visit: showVisit
      ? {
          city: place.visit.city,
          areas: place.visit.areas,
        }
      : null,
  };
}

export function serializePublicMaster(
  profile: MasterProfileRow,
  services: Awaited<ReturnType<typeof listServices>> = [],
) {
  return {
    id: profile.user_id,
    slug: profile.slug,
    name: profile.name,
    schedule: profile.schedule,
    timezone: profile.timezone,
    cancelHours: profile.cancel_hours,
    serviceTypeCode: profile.service_type_code,
    city: profile.city,
    workingHours: profile.working_hours as WorkingHours | null,
    avatarUrl: profile.avatar_url,
    about: profile.about_text,
    place: serializePublicPlace(profile),
    services: services.map(serializeService),
    bookingEnabled: profile.status === "active" && services.length > 0,
  };
}
