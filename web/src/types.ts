export type SessionStatus = "confirmed" | "cancelled" | "pending" | "paid";

export type SchedulePeriod = "today" | "tomorrow" | "week";

export interface Session {
  id: string;
  startsAt?: string;
  time: string;
  dateLabel: string;
  clientName: string;
  status: SessionStatus;
  paid?: boolean;
}

/** Per-day hours synced from onboarding (server may omit for legacy profiles). */
export type WorkingHoursDto = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  { enabled: boolean; start: string; end: string }
>;

/** Canonical FE name for provider profile. */
export interface MasterProfile {
  userId?: number;
  slug?: string;
  name: string;
  duration: 50 | 60;
  price: number;
  schedule: "weekday" | "weekend" | "manual";
  timezone?: string;
  cancelHours?: number;
  specialty?: string | null;
  city?: string;
  status?: "draft" | "active";
  onboardingStep?: number;
  onboardingComplete?: boolean;
  onboardingCompletedAt?: string | null;
  bookingLink?: string | null;
  workingHours?: WorkingHoursDto | null;
  dayBreakMin?: number | null;
  place?: MasterPlaceDto | null;
}

export type AddressVisibilityDto = "public" | "after_booking";

export type MasterPlaceDto = {
  mode: "studio" | "visit" | "both";
  studio: {
    city: string;
    address: string;
    comment: string;
    addressVisibility: AddressVisibilityDto;
  };
  visit: {
    city: string;
    areas: string;
  };
};

/** @deprecated Use MasterProfile */
export type PsychologistProfile = MasterProfile;

export interface MasterServiceDto {
  id: string;
  title: string;
  durationMin: number;
  price: number;
  priceMode: "fixed" | "from";
  breakAfterMin: number;
  description: string;
}

export interface TimeSlot {
  id: string;
  startsAt: string;
  dayLabel: string;
  date: string;
  time: string;
  available: boolean;
}

export interface PublicMaster {
  id: number;
  slug?: string;
  name: string;
  duration: 50 | 60;
  price: number;
  schedule: MasterProfile["schedule"];
  timezone: string;
  cancelHours: number;
  specialty?: string | null;
  city?: string;
  workingHours?: WorkingHoursDto | null;
}

/** @deprecated Use PublicMaster */
export type PublicPsychologist = PublicMaster;

export interface ClientBooking {
  id: string;
  startsAt: string;
  date: string;
  time: string;
  /** @deprecated Prefer masterId */
  psychologistId: number;
  masterId?: number;
  /** @deprecated Prefer masterName */
  psychologistName: string;
  masterName?: string;
  duration?: number;
  price?: number;
  status?: SessionStatus;
  cancelHours?: number;
}
