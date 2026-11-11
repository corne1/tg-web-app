export type SessionStatus = "confirmed" | "cancelled" | "pending" | "paid";

export type SchedulePeriod = "today" | "tomorrow" | "week";

export interface Session {
  id: string;
  startsAt?: string;
  time: string;
  dateLabel: string;
  clientName: string;
  clientId?: string | null;
  status: SessionStatus;
  paid?: boolean;
  durationMin?: number;
  price?: number;
  createdAt?: string;
}

/** Per-day hours synced from onboarding (server may omit when unset). */
export type WorkingHoursDto = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  { enabled: boolean; start: string; end: string }
>;

/** Canonical FE name for provider profile. */
export interface MasterProfile {
  userId?: number;
  slug?: string;
  name: string;
  schedule: "weekday" | "weekend" | "manual";
  timezone?: string;
  cancelHours?: number;
  serviceTypeCode?: string | null;
  city?: string;
  status?: "draft" | "active";
  onboardingStep?: number;
  onboardingComplete?: boolean;
  onboardingCompletedAt?: string | null;
  bookingLink?: string | null;
  workingHours?: WorkingHoursDto | null;
  dayBreakMin?: number | null;
  travelBufferMin?: number | null;
  place?: MasterPlaceDto | null;
  avatarUrl?: string | null;
  about?: string | null;
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

export interface MasterServiceDto {
  id: string;
  title: string;
  durationMin: number;
  price: number;
  priceMode: "fixed" | "from";
  breakAfterMin: number;
  description: string;
  serviceTypeCode?: string | null;
}

export interface TimeSlot {
  id: string;
  startsAt: string;
  dayLabel: string;
  date: string;
  time: string;
  available: boolean;
}

export type PublicPlaceDto = {
  mode: "studio" | "visit" | "both";
  studio: {
    city: string;
    address: string;
    addressVisible: boolean;
    addressHint: string | null;
  } | null;
  visit: {
    city: string;
    areas: string;
  } | null;
};

export interface PublicMaster {
  id: number;
  slug?: string;
  name: string;
  schedule: MasterProfile["schedule"];
  timezone: string;
  cancelHours: number;
  serviceTypeCode?: string | null;
  city?: string;
  workingHours?: WorkingHoursDto | null;
  avatarUrl?: string | null;
  about?: string | null;
  place?: PublicPlaceDto | null;
  services?: MasterServiceDto[];
  bookingEnabled?: boolean;
}

export interface ClientBooking {
  id: string;
  startsAt: string;
  date: string;
  time: string;
  masterId: number;
  masterName: string;
  masterAvatarUrl?: string | null;
  duration?: number;
  price?: number;
  priceLabel?: string;
  status?: SessionStatus;
  cancelHours?: number;
  serviceTitles?: string[];
  clientName?: string;
  placeChoice?: "studio" | "visit" | null;
  placeAddress?: string | null;
  canCancel?: boolean;
  canReschedule?: boolean;
  cancelBlockedReason?: string | null;
  rescheduleBlockedReason?: string | null;
  accessToken?: string | null;
  bookingLink?: string | null;
}
