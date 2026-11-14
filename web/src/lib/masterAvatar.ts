import avatarPlaceholder from "../assets/onboarding/avatar-placeholder.svg";

const AVATAR_KEY = "pomni.masterAvatarDataUrl.v1";

/** Local copy of the photo chosen on onboarding step 1. */
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

/**
 * Own master photo (onboarding choice): local → server → placeholder.
 * Pass `remote` from `profile.avatarUrl` when available.
 */
export function resolveMasterAvatarSrc(
  remote?: string | null,
): string {
  return loadMasterAvatarDataUrl() || remote || avatarPlaceholder;
}

/** Public/client view of a master — only server URL (no localStorage). */
export function resolvePublicMasterAvatarSrc(
  remote?: string | null,
): string {
  return remote || avatarPlaceholder;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}
