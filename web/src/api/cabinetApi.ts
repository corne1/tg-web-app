import type { BookingClient } from "../lib/bookingClients";
import type { MasterProfile, SchedulePeriod, Session } from "../types";
import { request } from "./http";

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

export async function fetchCabinetSessions(period: SchedulePeriod): Promise<{
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
  return request(`/api/cabinet/clients/${encodeURIComponent(clientId)}/notes`, {
    method: "POST",
    body: JSON.stringify({
      title: input.title ?? "Заметка",
      body: input.body,
    }),
  });
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
