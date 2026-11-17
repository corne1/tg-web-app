import avatarPlaceholder from "../assets/onboarding/avatar-placeholder.svg";

const AVATAR_KEY = "pomni.masterAvatarDataUrl.v1";

/** Keep under server `express.json` + DB avatar URL budget. */
const MAX_EDGE_PX = 512;
const JPEG_QUALITY = 0.82;

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
    // quota / private mode — caller should keep in-memory preview
  }
}

/**
 * Own master photo (onboarding choice): local → server → placeholder.
 * Pass `remote` from `profile.avatarUrl` when available.
 */
export function resolveMasterAvatarSrc(remote?: string | null): string {
  return loadMasterAvatarDataUrl() || remote || avatarPlaceholder;
}

/** Public/client view of a master — only server URL (no localStorage). */
export function resolvePublicMasterAvatarSrc(remote?: string | null): string {
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

/**
 * Downscale + JPEG-encode gallery photos so avatar PUT fits JSON body limits
 * and localStorage quota. Non-image inputs fall back to raw data-URL.
 */
export async function prepareAvatarDataUrl(file: File): Promise<string> {
  const raw = await readFileAsDataUrl(file);
  if (!file.type.startsWith("image/")) return raw;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height),
    );
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return raw;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const compressed = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return compressed.length < raw.length ? compressed : raw;
  } catch {
    return raw;
  }
}
