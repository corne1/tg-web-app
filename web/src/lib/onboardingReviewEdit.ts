import type { NavigateFunction } from "react-router-dom";
import type { PlaceStage } from "./placeStepFlow";

export type OnboardingReviewState = {
  /** Opened a wizard step via «Изменить» on publish review. */
  fromReview?: boolean;
  /** Open place step at this stage (usually 3 = review). */
  placeStage?: PlaceStage;
};

export const ONBOARDING_REVIEW_PATH = "/onboarding/place";

const FROM_REVIEW_KEY = "pomnyu.onboarding.fromReview";
/** Set while the publish checklist (place stage 3) is the return target. */
const REVIEW_STAGE_KEY = "pomnyu.onboarding.reviewStage";

export function readReviewState(state: unknown): OnboardingReviewState {
  if (!state || typeof state !== "object") return {};
  return state as OnboardingReviewState;
}

/** Sticky flag so Save still returns to review if location.state is dropped. */
export function markFromReview(): void {
  try {
    sessionStorage.setItem(FROM_REVIEW_KEY, "1");
  } catch {
    // private mode / quota
  }
}

export function clearFromReview(): void {
  try {
    sessionStorage.removeItem(FROM_REVIEW_KEY);
  } catch {
    // ignore
  }
}

function stickyFromReview(): boolean {
  try {
    return sessionStorage.getItem(FROM_REVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

export function isFromReview(state: unknown): boolean {
  return Boolean(readReviewState(state).fromReview) || stickyFromReview();
}

export function rememberOnboardingReview(): void {
  try {
    sessionStorage.setItem(REVIEW_STAGE_KEY, "3");
  } catch {
    // private mode / quota
  }
}

export function clearRememberedPlaceStage(): void {
  try {
    sessionStorage.removeItem(REVIEW_STAGE_KEY);
  } catch {
    // ignore
  }
}

function rememberedReview(): boolean {
  try {
    return sessionStorage.getItem(REVIEW_STAGE_KEY) === "3";
  } catch {
    return false;
  }
}

/**
 * Stage to open `/onboarding/place` on.
 * Explicit navigation wins. Otherwise a remembered checklist survives a
 * history POP whose entry has no `placeStage` (the page used to replace
 * that entry with `state: null` and remount at stage 1).
 */
export function initialOnboardingPlaceStage(state: unknown): PlaceStage {
  const requested = readReviewState(state).placeStage;
  if (requested === 1 || requested === 2 || requested === 3) return requested;
  return rememberedReview() ? 3 : 1;
}

/** Return to «Проверьте профиль» (place stage 3 / wizard step 4). */
export function navigateToOnboardingReview(navigate: NavigateFunction): void {
  rememberOnboardingReview();
  clearFromReview();
  navigate(ONBOARDING_REVIEW_PATH, {
    replace: true,
    state: { placeStage: 3 } satisfies OnboardingReviewState,
  });
}
