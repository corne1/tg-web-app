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

const HH_RUSSIA_URL = "https://api.hh.ru/areas/113";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cache: { names: string[]; loadedAt: number } | null = null;
let inflight: Promise<string[]> | null = null;

function collectCities(russiaAreas: HhArea[]): string[] {
  const set = new Set<string>();
  for (const regionOrCity of russiaAreas) {
    const children = regionOrCity.areas ?? [];
    if (children.length === 0) {
      const name = regionOrCity.name?.trim();
      if (name) set.add(name);
      continue;
    }
    for (const city of children) {
      const name = city.name?.trim();
      if (name) set.add(name);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ru"));
}

async function fetchRussiaCities(): Promise<string[]> {
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

export async function getRussiaCityNames(): Promise<string[]> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) {
    return cache.names;
  }
  if (!inflight) {
    inflight = fetchRussiaCities()
      .then((names) => {
        cache = { names, loadedAt: Date.now() };
        return names;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch (err) {
    if (cache?.names.length) return cache.names;
    throw err;
  }
}

function rankCity(name: string, q: string): number {
  const lower = name.toLowerCase();
  let score = 0;
  if (lower === q) score += 10_000;
  if (lower.startsWith(q)) score += 1_000;
  else if (lower.includes(q)) score += 100;
  else return -1;
  // Prefer plain city names over "Name (Region…)" disambiguations.
  if (!name.includes("(")) score += 200;
  // Shorter names tend to be actual cities (Москва before Москаленки).
  score += Math.max(0, 80 - name.length);
  return score;
}

export async function searchRussiaCities(
  query: string,
  limit = 8,
): Promise<string[]> {
  const names = await getRussiaCityNames();
  const q = query.trim().toLowerCase();
  const capped = Math.min(Math.max(limit, 1), 50);

  if (!q) {
    return [];
  }

  return names
    .map((name) => ({ name, score: rankCity(name, q) }))
    .filter((x) => x.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.name.localeCompare(b.name, "ru"),
    )
    .slice(0, capped)
    .map((x) => x.name);
}

export async function resolveRussiaCity(
  query: string,
): Promise<string | null> {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const names = await getRussiaCityNames();
  return names.find((n) => n.toLowerCase() === q) ?? null;
}
