import type {
  ClientBooking,
  MasterPlaceDto,
  MasterProfile,
  MasterServiceDto,
  PublicMaster,
  SchedulePeriod,
  Session,
  TimeSlot,
  WorkingHoursDto,
} from "./types";

export type CityHit = {
  name: string;
  region: string | null;
};

/** @deprecated Prefer MasterProfile */
export type { MasterProfile as PsychologistProfile } from "./types";

export type AppUser = {
  id: number;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
  language_code?: string | null;
  is_premium?: boolean;
  photo_url?: string | null;
  created_at?: string;
  updated_at?: string;
  last_seen_at?: string;
};

const TOKEN_KEY = "tg_session";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(path, { ...init, headers, credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export async function authenticate(initData: string): Promise<{
  token: string;
  user: AppUser;
}> {
  const data = await request<{ token: string; user: AppUser }>("/api/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ initData }),
  });
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function fetchMe(): Promise<{
  user: AppUser;
  profile: MasterProfile | null;
  services: MasterServiceDto[];
}> {
  const data = await request<{
    user: AppUser;
    profile: MasterProfile | null;
    services?: MasterServiceDto[];
  }>("/api/me");
  return {
    user: data.user,
    profile: data.profile,
    services: data.services ?? [],
  };
}

export async function saveProfile(
  profile: MasterProfile,
): Promise<MasterProfile> {
  const data = await request<{ profile: MasterProfile }>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
  return data.profile;
}

export async function saveMasterProfile(input: {
  name: string;
  specialty: string;
  city?: string;
}): Promise<MasterProfile> {
  const data = await request<{ profile: MasterProfile }>(
    "/api/master/profile",
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return data.profile;
}

export async function saveMasterHours(input: {
  hours: WorkingHoursDto;
  dayBreakMin?: number | null;
}): Promise<MasterProfile> {
  const data = await request<{ profile: MasterProfile }>("/api/master/hours", {
    method: "PUT",
    body: JSON.stringify({
      hours: input.hours,
      dayBreakMin: input.dayBreakMin ?? null,
    }),
  });
  return data.profile;
}

export async function saveMasterService(
  service: MasterServiceDto,
): Promise<MasterServiceDto> {
  const data = await request<{ service: MasterServiceDto }>(
    `/api/master/services/${encodeURIComponent(service.id)}`,
    {
      method: "PUT",
      body: JSON.stringify(service),
    },
  );
  return data.service;
}

export async function deleteMasterService(id: string): Promise<void> {
  await request(`/api/master/services/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function saveMasterPlace(
  place: MasterPlaceDto,
): Promise<MasterProfile> {
  const data = await request<{ profile: MasterProfile }>("/api/master/place", {
    method: "PUT",
    body: JSON.stringify({ place }),
  });
  return data.profile;
}

export async function completeMasterOnboarding(input?: {
  hours?: WorkingHoursDto;
  dayBreakMin?: number | null;
  place?: MasterPlaceDto | null;
}): Promise<MasterProfile> {
  const data = await request<{ profile: MasterProfile }>(
    "/api/master/complete",
    {
      method: "POST",
      body: JSON.stringify({
        hours: input?.hours,
        dayBreakMin: input?.dayBreakMin ?? null,
        place: input?.place ?? undefined,
      }),
    },
  );
  return data.profile;
}

export async function ensureMasterProfile(): Promise<{
  profile: MasterProfile;
  services: MasterServiceDto[];
}> {
  return request("/api/master/ensure", { method: "POST", body: "{}" });
}

export async function setMasterOnboardingStep(
  step: number,
): Promise<MasterProfile> {
  const data = await request<{ profile: MasterProfile }>(
    "/api/master/onboarding-step",
    { method: "PUT", body: JSON.stringify({ step }) },
  );
  return data.profile;
}

export async function searchCities(
  query: string,
  limit = 8,
): Promise<CityHit[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  const data = await request<{ cities: Array<string | CityHit> }>(
    `/api/cities?${params}`,
  );
  return data.cities.map((c) =>
    typeof c === "string" ? { name: c, region: null } : c,
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

/** Canonical public master fetch (`/masters` + legacy `/psychologists`). */
export async function fetchMaster(
  id: number | string,
): Promise<PublicMaster> {
  return request(`/api/masters/${encodeURIComponent(String(id))}`);
}

/** @deprecated Use fetchMaster — same payload via legacy path */
export async function fetchPsychologist(
  id: number | string,
): Promise<PublicMaster> {
  return request(`/api/psychologists/${encodeURIComponent(String(id))}`);
}

export async function fetchSlots(masterId: number | string): Promise<{
  psychologist: {
    id: number;
    name: string;
    duration: number;
    price: number;
  };
  master?: {
    id: number;
    name: string;
    duration: number;
    price: number;
  };
  slots: TimeSlot[];
}> {
  return request(
    `/api/masters/${encodeURIComponent(String(masterId))}/slots?days=7`,
  );
}

export async function fetchCabinetSessions(
  period: SchedulePeriod,
): Promise<{
  sessions: Session[];
  bookingLink: string | null;
  onboardingComplete?: boolean;
  onboardingStep?: number;
  profile?: MasterProfile;
}> {
  return request(`/api/cabinet/sessions?period=${period}`);
}

export async function createBooking(input: {
  psychologistId?: number;
  masterId?: number;
  startsAt: string;
}): Promise<{
  booking: {
    id: string;
    startsAt: string;
    time: string;
    date: string;
    psychologistName: string;
    duration: number;
    price: number;
    status: string;
  };
}> {
  return request("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      psychologistId: input.psychologistId ?? input.masterId,
      masterId: input.masterId ?? input.psychologistId,
      startsAt: input.startsAt,
    }),
  });
}

export async function fetchMyBookings(): Promise<{ bookings: ClientBooking[] }> {
  return request("/api/bookings/mine");
}

export async function cancelBooking(id: string): Promise<void> {
  await request(`/api/bookings/${id}/cancel`, { method: "POST", body: "{}" });
}

export async function rescheduleBooking(
  id: string,
  startsAt: string,
): Promise<void> {
  await request(`/api/bookings/${id}/reschedule`, {
    method: "POST",
    body: JSON.stringify({ startsAt }),
  });
}

export async function markBookingPaid(id: string): Promise<void> {
  await request(`/api/bookings/${id}/paid`, { method: "POST", body: "{}" });
}
