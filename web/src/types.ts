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

export interface PsychologistProfile {
  name: string;
  duration: 50 | 60;
  price: number;
  schedule: "weekday" | "weekend" | "manual";
  timezone?: string;
  cancelHours?: number;
  bookingLink?: string | null;
}

export interface TimeSlot {
  id: string;
  startsAt: string;
  dayLabel: string;
  date: string;
  time: string;
  available: boolean;
}

export interface ClientBooking {
  id: string;
  startsAt: string;
  date: string;
  time: string;
  psychologistId: number;
  psychologistName: string;
  duration?: number;
  price?: number;
  status?: SessionStatus;
  cancelHours?: number;
}

export interface PublicPsychologist {
  id: number;
  name: string;
  duration: 50 | 60;
  price: number;
  schedule: PsychologistProfile["schedule"];
  timezone: string;
  cancelHours: number;
}
