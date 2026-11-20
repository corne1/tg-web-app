export type MasterProfileInput = {
  name: string;
  serviceTypeCode: string;
  city: string;
  aboutText: string | undefined;
};

export function readMasterProfileBody(
  body: unknown,
): { ok: true; value: MasterProfileInput } | { ok: false; error: string } {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const serviceTypeCode =
    typeof record.serviceTypeCode === "string" ? record.serviceTypeCode.trim() : "";
  const city =
    typeof record.city === "string" && record.city.trim()
      ? record.city.trim()
      : "Москва";
  if (!name || name.length > 80) return { ok: false, error: "Invalid name" };
  if (!serviceTypeCode || serviceTypeCode.length > 40) {
    return { ok: false, error: "Invalid serviceTypeCode" };
  }
  const aboutRaw = record.about ?? record.aboutText;
  const aboutText = typeof aboutRaw === "string" ? aboutRaw : undefined;
  return { ok: true, value: { name, serviceTypeCode, city, aboutText } };
}
