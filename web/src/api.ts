import type { BookingClient } from "./lib/bookingClients";
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

export async function saveMasterProfile(input: {
  name: string;
  serviceTypeCode: string;
  city?: string;
  about?: string;
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

export async function saveMasterAvatar(
  avatarUrl: string | null,
): Promise<MasterProfile> {
  const data = await request<{ profile: MasterProfile }>("/api/master/avatar", {
    method: "PUT",
    body: JSON.stringify({ avatarUrl }),
  });
  return data.profile;
}

export async function createCabinetBooking(input: {
  masterClientId: string;
  dateISO: string;
  time: string;
  serviceIds: string[];
}): Promise<{
  booking: {
    id: string;
    startsAt: string;
    time: string;
    date: string;
    clientName: string;
    duration: number;
    price: number;
    status: string;
    serviceTitles: string[];
  };
}> {
  return request("/api/cabinet/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function saveMasterHours(input: {
  hours: WorkingHoursDto;
  dayBreakMin?: number | null;
  scheduleBreak?: MasterProfile["scheduleBreak"];
}): Promise<MasterProfile> {
  const data = await request<{ profile: MasterProfile }>("/api/master/hours", {
    method: "PUT",
    body: JSON.stringify({
      hours: input.hours,
      dayBreakMin: input.dayBreakMin ?? null,
      scheduleBreak: input.scheduleBreak ?? undefined,
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
  opts?: { travelBufferMin?: number | null },
): Promise<MasterProfile> {
  const data = await request<{ profile: MasterProfile }>("/api/master/place", {
    method: "PUT",
    body: JSON.stringify({
      place,
      travelBufferMin: opts?.travelBufferMin,
    }),
  });
  return data.profile;
}

export async function completeMasterOnboarding(input?: {
  hours?: WorkingHoursDto;
  dayBreakMin?: number | null;
  scheduleBreak?: MasterProfile["scheduleBreak"];
  place?: MasterPlaceDto | null;
}): Promise<MasterProfile> {
  const data = await request<{ profile: MasterProfile }>(
    "/api/master/complete",
    {
      method: "POST",
      body: JSON.stringify({
        hours: input?.hours,
        dayBreakMin: input?.dayBreakMin ?? null,
        scheduleBreak: input?.scheduleBreak ?? undefined,
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

export type ServiceTypeDto = {
  code: string;
  label: string;
  title: string;
  sortOrder: number;
};

export async function fetchServiceTypes(): Promise<ServiceTypeDto[]> {
  const data = await request<{ serviceTypes: ServiceTypeDto[] }>(
    "/api/service-types",
  );
  return data.serviceTypes ?? [];
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

export async function fetchMaster(
  id: number | string,
): Promise<PublicMaster> {
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

export type AddressHit = {
  label: string;
  city: string;
  street: string;
  house: string;
};

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

export async function fetchCabinetClients(): Promise<{
  clients: BookingClient[];
}> {
  return request("/api/cabinet/clients");
}

export async function fetchCabinetClient(
  clientId: string,
): Promise<{ client: BookingClient }> {
  return request(`/api/cabinet/clients/${encodeURIComponent(clientId)}`);
}

export async function createCabinetClient(input: {
  name: string;
  phone?: string;
}): Promise<{ client: BookingClient }> {
  return request("/api/cabinet/clients", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      phone: input.phone ?? "",
    }),
  });
}

export async function createCabinetClientNote(
  clientId: string,
  input: { title?: string; body: string },
): Promise<{ client: BookingClient }> {
  return request(
    `/api/cabinet/clients/${encodeURIComponent(clientId)}/notes`,
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title ?? "Заметка",
        body: input.body,
      }),
    },
  );
}

export async function updateCabinetClientNote(
  clientId: string,
  noteId: string,
  input: { title?: string; body: string },
): Promise<{ client: BookingClient }> {
  return request(
    `/api/cabinet/clients/${encodeURIComponent(clientId)}/notes/${encodeURIComponent(noteId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        title: input.title ?? "Заметка",
        body: input.body,
      }),
    },
  );
}

export async function deleteCabinetClientNote(
  clientId: string,
  noteId: string,
): Promise<{ client: BookingClient }> {
  return request(
    `/api/cabinet/clients/${encodeURIComponent(clientId)}/notes/${encodeURIComponent(noteId)}`,
    { method: "DELETE" },
  );
}

export async function createBooking(input: {
  masterId: number;
  startsAt: string;
  serviceIds?: string[];
  placeChoice?: "studio" | "visit" | null;
  visitCity?: string;
  visitArea?: string;
  visitAddress?: string;
  visitApt?: string;
  visitEntrance?: string;
  visitFloor?: string;
  visitIntercom?: string;
  visitNote?: string;
  clientName?: string;
  comment?: string;
}): Promise<{
  booking: {
    id: string;
    startsAt: string;
    time: string;
    date: string;
    masterName: string;
    masterId?: number;
    duration: number;
    price: number;
    priceLabel?: string;
    status: string;
    serviceTitles?: string[];
    placeChoice?: "studio" | "visit" | null;
    placeAddress?: string | null;
    clientName?: string;
    comment?: string | null;
  };
}> {
  return request("/api/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchMyBookings(): Promise<{ bookings: ClientBooking[] }> {
  return request("/api/bookings/mine");
}

export async function fetchClientBooking(
  id: string,
): Promise<{ booking: ClientBooking }> {
  return request(`/api/bookings/${encodeURIComponent(id)}`);
}

export async function fetchClientBookingByToken(
  token: string,
): Promise<{ booking: ClientBooking }> {
  return request(`/api/bookings/t/${encodeURIComponent(token)}`);
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
