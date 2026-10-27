import type {
  ClientBooking,
  PsychologistProfile,
  PublicPsychologist,
  SchedulePeriod,
  Session,
  TimeSlot,
} from "./types";

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
  profile: PsychologistProfile | null;
}> {
  return request("/api/me");
}

export async function saveProfile(
  profile: PsychologistProfile,
): Promise<PsychologistProfile> {
  const data = await request<{ profile: PsychologistProfile }>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
  return data.profile;
}

export async function fetchPsychologist(
  id: number,
): Promise<PublicPsychologist> {
  return request(`/api/psychologists/${id}`);
}

export async function fetchSlots(psychologistId: number): Promise<{
  psychologist: {
    id: number;
    name: string;
    duration: number;
    price: number;
  };
  slots: TimeSlot[];
}> {
  return request(`/api/psychologists/${psychologistId}/slots?days=7`);
}

export async function fetchCabinetSessions(
  period: SchedulePeriod,
): Promise<{ sessions: Session[]; bookingLink: string | null }> {
  return request(`/api/cabinet/sessions?period=${period}`);
}

export async function createBooking(input: {
  psychologistId: number;
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
    body: JSON.stringify(input),
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
