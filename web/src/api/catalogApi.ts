import type { PublicMaster, TimeSlot } from "../types";
import { request } from "./http";

export type CityHit = {
  name: string;
  region: string | null;
};

export type ServiceTypeDto = {
  code: string;
  label: string;
  title: string;
  sortOrder: number;
};

export type AddressHit = {
  label: string;
  city: string;
  street: string;
  house: string;
};

export async function fetchServiceTypes(): Promise<ServiceTypeDto[]> {
  const data = await request<{ serviceTypes: ServiceTypeDto[] }>("/api/service-types");
  return data.serviceTypes ?? [];
}

export async function searchCities(query: string, limit = 8): Promise<CityHit[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  const data = await request<{ cities: Array<string | CityHit> }>(
    `/api/cities?${params}`,
  );
  return data.cities.map((city) =>
    typeof city === "string" ? { name: city, region: null } : city,
  );
}

export async function resolveCity(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    q: query,
    resolve: "1",
  });
  const data = await request<{ city: string | null }>(`/api/cities?${params}`);
  return data.city;
}

export async function fetchMaster(id: number | string): Promise<PublicMaster> {
  return request(`/api/masters/${encodeURIComponent(String(id))}`);
}

export async function fetchSlots(
  masterId: number | string,
  opts?: { days?: number; durationMin?: number; visit?: boolean },
): Promise<{
  master: {
    id: number;
    name: string;
    duration: number;
    price?: number;
    travelBufferMin?: number | null;
  };
  slots: TimeSlot[];
}> {
  const params = new URLSearchParams({
    days: String(opts?.days ?? 7),
  });
  if (opts?.durationMin != null && opts.durationMin > 0) {
    params.set("duration", String(opts.durationMin));
  }
  if (opts?.visit) params.set("visit", "1");
  return request(
    `/api/masters/${encodeURIComponent(String(masterId))}/slots?${params}`,
  );
}

export async function suggestAddresses(
  query: string,
  limit = 6,
): Promise<AddressHit[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  const data = await request<{ suggestions: AddressHit[] }>(
    `/api/address?${params}`,
  );
  return data.suggestions ?? [];
}
