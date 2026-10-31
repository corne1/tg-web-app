/**
 * Russian cities from HeadHunter public areas API (area 113 = Russia).
 * Cached in memory after first successful fetch.
 *
 * Collects federal cities (depth-1 leaves) and settlements under regions
 * (depth-2 only) to avoid villages nested deeper in the tree.
 */

type HhArea = {
  id: string;
  name: string;
  areas?: HhArea[];
};

export type CityHit = {
  name: string;
  /** Parent region name when known (null for federal cities like Москва). */
  region: string | null;
};

const HH_RUSSIA_URL = "https://api.hh.ru/areas/113";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cache: { cities: CityHit[]; loadedAt: number } | null = null;
let inflight: Promise<CityHit[]> | null = null;

function collectCities(russiaAreas: HhArea[]): CityHit[] {
  const byName = new Map<string, CityHit>();
  for (const regionOrCity of russiaAreas) {
    const children = regionOrCity.areas ?? [];
    if (children.length === 0) {
      const name = regionOrCity.name?.trim();
      if (name && !byName.has(name)) {
        byName.set(name, { name, region: null });
      }
      continue;
    }
    const regionName = regionOrCity.name?.trim() || null;
    for (const city of children) {
      const name = city.name?.trim();
      if (!name) continue;
      const existing = byName.get(name);
      if (!existing) {
        byName.set(name, { name, region: regionName });
      } else if (!existing.region && regionName) {
        byName.set(name, { name, region: regionName });
      }
    }
  }
  return [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "ru"),
  );
}

async function fetchRussiaCities(): Promise<CityHit[]> {
  const res = await fetch(HH_RUSSIA_URL, {
    headers: {
      "User-Agent": "PomniMiniApp/1.0 (cities)",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`HH areas HTTP ${res.status}`);
  }
  const root = (await res.json()) as HhArea;
  return collectCities(root.areas ?? []);
}

export async function getRussiaCities(): Promise<CityHit[]> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) {
    return cache.cities;
  }
  if (!inflight) {
    inflight = fetchRussiaCities()
      .then((cities) => {
        cache = { cities, loadedAt: Date.now() };
        return cities;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch (err) {
    if (cache?.cities.length) return cache.cities;
    throw err;
  }
}

/** @deprecated Prefer getRussiaCities — kept for callers that only need names. */
export async function getRussiaCityNames(): Promise<string[]> {
  const cities = await getRussiaCities();
  return cities.map((c) => c.name);
}

function rankCity(name: string, q: string): number {
  const lower = name.toLowerCase();
  let score = 0;
  if (lower === q) score += 10_000;
  if (lower.startsWith(q)) score += 1_000;
  else if (lower.includes(q)) score += 100;
  else return -1;
  if (!name.includes("(")) score += 200;
  score += Math.max(0, 80 - name.length);
  return score;
}

export async function searchRussiaCities(
  query: string,
  limit = 8,
): Promise<CityHit[]> {
  const cities = await getRussiaCities();
  const q = query.trim().toLowerCase();
  const capped = Math.min(Math.max(limit, 1), 50);

  if (!q) {
    return [];
  }

  return cities
    .map((city) => ({ city, score: rankCity(city.name, q) }))
    .filter((x) => x.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.city.name.localeCompare(b.city.name, "ru"),
    )
    .slice(0, capped)
    .map((x) => x.city);
}

export async function resolveRussiaCity(
  query: string,
): Promise<string | null> {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const cities = await getRussiaCities();
  return cities.find((c) => c.name.toLowerCase() === q)?.name ?? null;
}
