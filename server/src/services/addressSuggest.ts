/**
 * Lightweight address suggestions via OpenStreetMap Nominatim (RU bias).
 * Best-effort — empty list on network/rate failures.
 */

export type AddressHit = {
  label: string;
  city: string;
  street: string;
  house: string;
};

const NOMINATIM =
  "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=ru&limit=";

export async function suggestAddresses(
  query: string,
  limit = 6,
): Promise<AddressHit[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${NOMINATIM}${Math.min(10, Math.max(1, limit))}&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "pomni-tg-mini-app/1.0 (booking address suggest)",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      display_name?: string;
      address?: Record<string, string>;
    }>;
    if (!Array.isArray(data)) return [];
    const out: AddressHit[] = [];
    for (const row of data) {
      const a = row.address ?? {};
      const city =
        a.city || a.town || a.village || a.municipality || a.state || "";
      const street = a.road || a.pedestrian || a.street || "";
      const house = a.house_number || "";
      const label =
        row.display_name?.split(",").slice(0, 3).join(",").trim() ||
        [street, house, city].filter(Boolean).join(", ");
      if (!label) continue;
      out.push({ label, city, street, house });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}
