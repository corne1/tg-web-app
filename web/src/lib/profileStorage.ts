import type { MasterProfile } from "../types";

/** Legacy key kept for existing installs. */
const PROFILE_CACHE_KEY = "psychologistProfileCache";

/** Local cache of server profile (optional offline hint for hub routing). */
export function cacheProfile(profile: MasterProfile | null): void {
  if (!profile) {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    return;
  }
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
}

export function getCachedProfile(): MasterProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MasterProfile;
  } catch {
    return null;
  }
}

export function isOnboardingDone(profile?: MasterProfile | null): boolean {
  const p = profile ?? getCachedProfile();
  if (!p) return false;
  // Only explicit completion — do not infer from name/price defaults.
  return Boolean(p.onboardingComplete || p.status === "active");
}

/** Resume path for incomplete master onboarding. */
export function masterResumePath(profile?: MasterProfile | null): string {
  const p = profile ?? getCachedProfile();
  if (isOnboardingDone(p)) return "/cabinet";
  const step = p?.onboardingStep ?? 1;
  if (step <= 1) return "/onboarding";
  if (step === 2) return "/onboarding/services";
  if (step === 3) return "/onboarding/hours";
  if (step >= 4) return "/onboarding/place";
  return "/onboarding";
}
