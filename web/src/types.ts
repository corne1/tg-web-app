export type SessionStatus = "confirmed" | "cancelled" | "pending" | "paid";

export type SchedulePeriod = "today" | "tomorrow" | "week";

export interface Session {
  id: string;
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
}

export interface TimeSlot {
  id: string;
  dayLabel: string;
  date: string;
  time: string;
  available: boolean;
}

export interface ClientBooking {
  id: string;
  date: string;
  time: string;
  psychologistName: string;
}
