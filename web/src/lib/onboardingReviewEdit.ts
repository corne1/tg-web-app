import type { NavigateFunction } from "react-router-dom";
import type { PlaceStage } from "./placeStepFlow";

export type OnboardingReviewState = {
  /** Opened a wizard step via «Изменить» on publish review. */
  fromReview?: boolean;
  /** Open place step at this stage (usually 3 = review). */
  placeStage?: PlaceStage;
};

export const ONBOARDING_REVIEW_PATH = "/onboarding/place";

export function readReviewState(state: unknown): OnboardingReviewState {
  if (!state || typeof state !== "object") return {};
  return state as OnboardingReviewState;
}

export function isFromReview(state: unknown): boolean {
  return Boolean(readReviewState(state).fromReview);
}

/** Return to «Проверьте профиль» (place stage 3 / wizard step 4). */
export function navigateToOnboardingReview(navigate: NavigateFunction): void {
  navigate(ONBOARDING_REVIEW_PATH, {
    state: { placeStage: 3 } satisfies OnboardingReviewState,
  });
}
