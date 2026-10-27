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

export type PsychologistProfileRow = {
  user_id: number;
  name: string;
  duration: 50 | 60;
  price: number;
  schedule: ScheduleKind;
  timezone: string;
  cancel_hours: number;
  created_at: string;
  updated_at: string;
};

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "paid";

export type BookingRow = {
  id: string;
  psychologist_id: number;
  client_id: number;
  starts_at: string;
  duration_min: number;
  price: number;
  status: BookingStatus;
  paid: boolean;
  client_name: string;
  reminded_24h: boolean;
  reminded_1h: boolean;
  created_at: string;
  updated_at: string;
};
