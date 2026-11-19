/**
 * Publish-review return target. Run: npx tsx src/lib/onboardingReviewEdit.test.ts
 */
import {
  clearFromReview,
  clearRememberedPlaceStage,
  initialOnboardingPlaceStage,
  isFromReview,
  markFromReview,
  rememberOnboardingReview,
} from "./onboardingReviewEdit.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const mem = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, value);
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
  },
});

mem.clear();
assert(initialOnboardingPlaceStage(null) === 1, "fresh visit is stage 1");
assert(initialOnboardingPlaceStage({}) === 1, "empty state is stage 1");
assert(initialOnboardingPlaceStage({ placeStage: 1 }) === 1, "explicit stage 1");
assert(initialOnboardingPlaceStage({ placeStage: 2 }) === 2, "explicit stage 2");
assert(initialOnboardingPlaceStage({ placeStage: 3 }) === 3, "explicit stage 3");

rememberOnboardingReview();
assert(
  initialOnboardingPlaceStage(null) === 3,
  "remembered checklist wins when history state is empty",
);
assert(
  initialOnboardingPlaceStage({ placeStage: 2 }) === 2,
  "explicit stage wins over memory",
);
clearRememberedPlaceStage();
assert(initialOnboardingPlaceStage(null) === 1, "cleared memory is stage 1");

assert(isFromReview(null) === false, "no review flag");
markFromReview();
assert(isFromReview(null) === true, "sticky review flag");
assert(isFromReview({ fromReview: true }) === true, "state review flag");
clearFromReview();
assert(isFromReview(null) === false, "sticky flag cleared");
assert(isFromReview({ fromReview: true }) === true, "state flag remains");

console.log("onboardingReviewEdit tests ok");
