import { loadMasterDraft, saveMasterDraft } from "./masterDraft";

export const PUBLIC_ABOUT_KEY = "masterPublicAbout";

/** Unsaved public-page text lives on the master draft, not in its own key. */
export function loadPublicAbout(): string {
  return loadMasterDraft().about;
}

export function savePublicAbout(about: string): void {
  const draft = loadMasterDraft();
  saveMasterDraft({ ...draft, about });
  try {
    localStorage.removeItem(PUBLIC_ABOUT_KEY);
  } catch {
    // ignore quota / private mode
  }
}
