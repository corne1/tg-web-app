/** Master opens own public page via «Посмотреть как клиент» (Figma 21416:130604). */

export type ClientPreviewState = {
  clientPreview: true;
  /** Where Telegram Back / overlay chevron returns. */
  previewBackTo: string;
};

export function isClientPreview(state: unknown): state is ClientPreviewState {
  if (!state || typeof state !== "object") return false;
  const s = state as Record<string, unknown>;
  return (
    s.clientPreview === true &&
    typeof s.previewBackTo === "string" &&
    s.previewBackTo.length > 0
  );
}

export function clientPreviewState(backTo: string): ClientPreviewState {
  return { clientPreview: true, previewBackTo: backTo };
}
