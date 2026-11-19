import { cacheProfile } from "./profileStorage";
import { clearMasterDraft } from "./masterDraft";
import { saveMasterAvatarDataUrl } from "./masterAvatar";

/** Drafts are global in this browser, so a reset must not keep the previous form. */
export function clearLocalMasterState(): void {
  clearMasterDraft();
  saveMasterAvatarDataUrl(null);
  cacheProfile(null);
  try {
    localStorage.removeItem("masterPublicAbout");
    localStorage.removeItem("pomni.bookingDraft.v1");
    localStorage.removeItem("pomnyu.devAccountId");
    sessionStorage.removeItem("pomnyu.onboarding.fromReview");
    sessionStorage.removeItem("pomnyu.onboarding.reviewStage");
  } catch {
    // ignore
  }
}
