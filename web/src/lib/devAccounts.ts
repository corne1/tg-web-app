import { cacheProfile } from "./profileStorage";
import { clearMasterDraft } from "./masterDraft";
import { saveMasterAvatarDataUrl } from "./masterAvatar";

const DEV_ACCOUNT_KEY = "pomnyu.devAccountId";

export function readDevAccountId(): number | null {
  try {
    const id = Number(localStorage.getItem(DEV_ACCOUNT_KEY));
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function writeDevAccountId(id: number): void {
  localStorage.setItem(DEV_ACCOUNT_KEY, String(id));
}

export function clearDevAccountId(): void {
  try {
    localStorage.removeItem(DEV_ACCOUNT_KEY);
  } catch {
    // ignore
  }
}

/** Drafts are global in this browser, so a switch must not keep the previous master's form. */
export function clearLocalMasterState(): void {
  clearMasterDraft();
  saveMasterAvatarDataUrl(null);
  cacheProfile(null);
  try {
    localStorage.removeItem("masterPublicAbout");
    localStorage.removeItem("pomni.bookingDraft.v1");
    sessionStorage.removeItem("pomnyu.onboarding.fromReview");
    sessionStorage.removeItem("pomnyu.onboarding.reviewStage");
  } catch {
    // ignore
  }
}
