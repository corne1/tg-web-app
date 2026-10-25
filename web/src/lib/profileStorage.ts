import { psychologistName } from "../data/mock";
import type { ClientBooking, PsychologistProfile } from "../types";
import { defaultClientBookings } from "../data/mock";

const PROFILE_KEY = "psychologistProfile";
const BOOKINGS_KEY = "clientBookings";

export function getPsychologistProfile(): PsychologistProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PsychologistProfile;
  } catch {
    return null;
  }
}

export function savePsychologistProfile(profile: PsychologistProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function isOnboardingDone(): boolean {
  const p = getPsychologistProfile();
  return Boolean(p?.name && p.duration && p.price && p.schedule);
}

export function getDisplayPsychologistName(): string {
  return getPsychologistProfile()?.name ?? psychologistName;
}

export function loadClientBookings(): ClientBooking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    if (!raw) return [...defaultClientBookings];
    return JSON.parse(raw) as ClientBooking[];
  } catch {
    return [...defaultClientBookings];
  }
}

export function saveClientBookings(bookings: ClientBooking[]): void {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

export function addClientBooking(booking: ClientBooking): void {
  const list = loadClientBookings();
  list.unshift(booking);
  saveClientBookings(list);
}
