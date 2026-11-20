import type {
  MasterPlaceDto,
  MasterProfile,
  MasterServiceDto,
  WorkingHoursDto,
} from "../types";
import { request, setStoredToken, type AppUser } from "./http";

export async function resetTestUser(): Promise<void> {
  await request("/api/me/reset", { method: "POST" });
}

export async function authenticate(initData: string): Promise<{
  token: string;
  user: AppUser;
}> {
  const data = await request<{ token: string; user: AppUser }>("/api/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ initData }),
  });
  setStoredToken(data.token);
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
  const data = await request<{ profile: MasterProfile }>("/api/master/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
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

export async function saveMasterBookingRules(input: {
  clientCancelEnabled?: boolean;
  clientRescheduleEnabled?: boolean;
  cancelHours?: number;
  rescheduleHours?: number;
}): Promise<MasterProfile> {
  const data = await request<{ profile: MasterProfile }>(
    "/api/master/booking-rules",
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
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
  const data = await request<{ profile: MasterProfile }>("/api/master/complete", {
    method: "POST",
    body: JSON.stringify({
      hours: input?.hours,
      dayBreakMin: input?.dayBreakMin ?? null,
      scheduleBreak: input?.scheduleBreak ?? undefined,
      place: input?.place ?? undefined,
    }),
  });
  return data.profile;
}

export async function ensureMasterProfile(): Promise<{
  profile: MasterProfile;
  services: MasterServiceDto[];
}> {
  return request("/api/master/ensure", { method: "POST", body: "{}" });
}

export async function setMasterOnboardingStep(step: number): Promise<MasterProfile> {
  const data = await request<{ profile: MasterProfile }>(
    "/api/master/onboarding-step",
    { method: "PUT", body: JSON.stringify({ step }) },
  );
  return data.profile;
}
