type Ok<T> = { ok: true; value: T; error?: undefined };
type Fail = { ok: false; error: string; value?: undefined };
export type ParseResult<T> = Ok<T> | Fail;

function recordOf(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

export function readCabinetClientBody(
  body: unknown,
): ParseResult<{ name: string; phone: string }> {
  const record = recordOf(body);
  const name = String(record.name ?? "").trim();
  const phone = String(record.phone ?? "").trim();
  if (!name) return { ok: false, error: "name required" };
  return { ok: true, value: { name, phone } };
}

export function readNoteBody(
  body: unknown,
): ParseResult<{ title: string; body: string }> {
  const record = recordOf(body);
  const title = String(record.title ?? "").trim();
  const noteBody = String(record.body ?? "").trim();
  if (!noteBody) return { ok: false, error: "body required" };
  return { ok: true, value: { title: title || "Заметка", body: noteBody } };
}

export function readCabinetBookingBody(body: unknown): ParseResult<{
  masterClientId: string;
  dateISO: string;
  hour: number;
  minute: number;
  serviceIds: string[];
}> {
  const record = recordOf(body);
  const masterClientId = String(record.masterClientId ?? record.clientId ?? "");
  const dateISO = String(record.dateISO ?? "").trim();
  const time = String(record.time ?? "").trim();
  const serviceIds = Array.isArray(record.serviceIds)
    ? record.serviceIds.map((id) => String(id))
    : [];
  if (!masterClientId || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    return { ok: false, error: "masterClientId and dateISO required" };
  }
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!timeMatch) return { ok: false, error: "time required (HH:MM)" };
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { ok: false, error: "Invalid time" };
  }
  return { ok: true, value: { masterClientId, dateISO, hour, minute, serviceIds } };
}
