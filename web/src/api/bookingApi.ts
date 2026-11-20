import type { ClientBooking } from "../types";
import { request } from "./http";

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

export async function rescheduleBooking(id: string, startsAt: string): Promise<void> {
  await request(`/api/bookings/${id}/reschedule`, {
    method: "POST",
    body: JSON.stringify({ startsAt }),
  });
}

export async function markBookingPaid(id: string): Promise<void> {
  await request(`/api/bookings/${id}/paid`, { method: "POST", body: "{}" });
}
