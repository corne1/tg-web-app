import { bookingDeepLink, psychologistDeepLink } from "../config.js";
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
    duration: profile.duration,
    price: profile.price,
    schedule: profile.schedule,
    timezone: profile.timezone,
    cancelHours: profile.cancel_hours,
    specialty: profile.specialty,
    city: profile.city,
    status: profile.status,
    onboardingStep: profile.onboarding_step,
    onboardingComplete,
    onboardingCompletedAt: profile.onboarding_completed_at,
    workingHours: profile.working_hours,
    dayBreakMin: profile.day_break_min,
    place: profile.place,
    bookingLink:
      bookingDeepLink(profile.slug) ?? psychologistDeepLink(profile.user_id),
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
  };
}

export function serializePublicMaster(profile: MasterProfileRow) {
  return {
    id: profile.user_id,
    slug: profile.slug,
    name: profile.name,
    duration: profile.duration,
    price: profile.price,
    schedule: profile.schedule,
    timezone: profile.timezone,
    cancelHours: profile.cancel_hours,
    specialty: profile.specialty,
    city: profile.city,
    workingHours: profile.working_hours as WorkingHours | null,
  };
}
