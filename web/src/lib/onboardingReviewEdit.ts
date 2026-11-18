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

/** Return to «Проверьте профиль» (place stage 3 / wizard step 4). */
export function navigateToOnboardingReview(navigate: NavigateFunction): void {
  clearFromReview();
  navigate(ONBOARDING_REVIEW_PATH, {
    state: { placeStage: 3 } satisfies OnboardingReviewState,
  });
}
