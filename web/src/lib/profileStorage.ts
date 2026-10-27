import type { PsychologistProfile } from "../types";

const PROFILE_CACHE_KEY = "psychologistProfileCache";

/** Local cache of server profile (optional offline hint for hub routing). */
export function cacheProfile(profile: PsychologistProfile | null): void {
  if (!profile) {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    return;
  }
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
}

export function getCachedProfile(): PsychologistProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PsychologistProfile;
  } catch {
    return null;
  }
}

export function isOnboardingDone(profile?: PsychologistProfile | null): boolean {
  const p = profile ?? getCachedProfile();
  return Boolean(p?.name && p.duration && p.price && p.schedule);
}
