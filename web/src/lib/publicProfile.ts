const ABOUT_KEY = "masterPublicAbout";

export function loadPublicAbout(): string {
  try {
    return localStorage.getItem(ABOUT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePublicAbout(about: string): void {
  try {
    localStorage.setItem(ABOUT_KEY, about);
  } catch {
    // ignore quota / private mode
  }
}
