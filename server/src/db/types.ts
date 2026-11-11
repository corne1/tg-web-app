import type { MasterPlace } from "../lib/place.js";
import type { WorkingHours } from "../lib/workingHours.js";

export type StoredUser = {
  id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  language_code: string | null;
  is_premium: boolean;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
};

export type ScheduleKind = "weekday" | "weekend" | "manual";

/** draft = onboarding in progress; active = finished and usable for booking */
export type MasterProfileStatus = "draft" | "active";

/** Reference catalog: kinds of services (specialty codes). */
export type ServiceTypeRow = {
  code: string;
  label: string;
  title: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MasterProfileRow = {
  user_id: number;
  slug: string;
  name: string;
  /** FK → service_types.code */
  service_type_code: string | null;
  city: string;
  schedule: ScheduleKind;
  /** Custom weekly hours from onboarding; null → use schedule presets in slots. */
  working_hours: WorkingHours | null;
  day_break_min: number | null;
  /** Minutes reserved before visit start for travel (visit bookings). */
  travel_buffer_min: number | null;
  /** Reception place from onboarding step 4; null if not set. */
  place: MasterPlace | null;
  timezone: string;
  cancel_hours: number;
  status: MasterProfileStatus;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  /** Public avatar URL or data-URL (Blur #16). */
  avatar_url: string | null;
  /** Public «О мастере» bio. */
  about_text: string | null;
  created_at: string;
  updated_at: string;
};

export type MasterServiceRow = {
  id: string;
  master_id: number;
  title: string;
  duration_min: number;
  price: number;
  price_mode: "fixed" | "from";
  break_after_min: number;
  description: string;
  sort_order: number;
  /** FK → service_types.code */
  service_type_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "paid";
export type BookingPlaceChoice = "studio" | "visit";

export type BookingServiceRow = {
  id: string;
  booking_id: string;
  service_id: string | null;
  sort_order: number;
  title: string;
  duration_min: number;
  break_after_min: number;
  price: number;
  price_mode: "fixed" | "from";
  created_at: string;
};

export type BookingRow = {
  id: string;
  master_id: number;
  client_id: number;
  starts_at: string;
  /** Cached sum of booking_services durations (+ breaks) for slot conflict index. */
  duration_min: number;
  /** Cached sum of booking_services prices. */
  price: number;
  price_from: boolean;
  status: BookingStatus;
  paid: boolean;
  client_name: string;
  reminded_24h: boolean;
  reminded_1h: boolean;
  created_at: string;
  updated_at: string;
  master_client_id: string | null;
  access_token: string | null;
  place_choice: BookingPlaceChoice | null;
  place_address: string | null;
  client_comment: string | null;
  visit_json: string | null;
  services: BookingServiceRow[];
};
