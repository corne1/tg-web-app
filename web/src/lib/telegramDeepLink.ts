type TgLinkHost = {
  openTelegramLink?: (url: string) => void;
} | null | undefined;

/** Open client chat by @username. Returns false if open failed. */
export function openClientTelegram(
  username: string,
  webApp: TgLinkHost,
): boolean {
  const handle = username.trim().replace(/^@/, "");
  if (!handle) return false;
  const url = `https://t.me/${encodeURIComponent(handle)}`;
  try {
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(url);
      return true;
    }
    const win = window.open(url, "_blank", "noopener,noreferrer");
    return Boolean(win);
  } catch {
    return false;
  }
}
