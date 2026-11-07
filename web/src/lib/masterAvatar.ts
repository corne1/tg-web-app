const AVATAR_KEY = "pomni.masterAvatarDataUrl.v1";

/** Local preview until server photo upload exists (Blur #16). */
export function loadMasterAvatarDataUrl(): string | null {
  try {
    return localStorage.getItem(AVATAR_KEY);
  } catch {
    return null;
  }
}

export function saveMasterAvatarDataUrl(dataUrl: string | null): void {
  try {
    if (!dataUrl) {
      localStorage.removeItem(AVATAR_KEY);
      return;
    }
    localStorage.setItem(AVATAR_KEY, dataUrl);
  } catch {
    // quota / private mode
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}
