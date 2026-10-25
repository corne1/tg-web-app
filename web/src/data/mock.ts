import type { ClientBooking, Session, TimeSlot } from "../types";

export const psychologistName = "Елена";

export const todaySessions: Session[] = [
  {
    id: "1",
    time: "10:00",
    dateLabel: "Сегодня, 15 октября",
    clientName: "Анна",
    status: "confirmed",
  },
  {
    id: "2",
    time: "12:00",
    dateLabel: "Сегодня, 15 октября",
    clientName: "Пётр",
    status: "confirmed",
  },
  {
    id: "3",
    time: "15:00",
    dateLabel: "Сегодня, 15 октября",
    clientName: "Мария",
    status: "cancelled",
  },
];

export const tomorrowSessions: Session[] = [
  {
    id: "4",
    time: "11:00",
    dateLabel: "Завтра, 16 октября",
    clientName: "Игорь",
    status: "confirmed",
  },
  {
    id: "5",
    time: "14:00",
    dateLabel: "Завтра, 16 октября",
    clientName: "Ольга",
    status: "pending",
  },
];

export const weekSessions: Session[] = [
  ...todaySessions,
  ...tomorrowSessions,
  {
    id: "6",
    time: "10:00",
    dateLabel: "Четверг, 17 октября",
    clientName: "Дмитрий",
    status: "confirmed",
  },
  {
    id: "7",
    time: "16:00",
    dateLabel: "Пятница, 18 октября",
    clientName: "Светлана",
    status: "confirmed",
  },
];

const days = [
  { dayLabel: "Пн", date: "14 окт" },
  { dayLabel: "Вт", date: "15 окт" },
  { dayLabel: "Ср", date: "16 окт" },
  { dayLabel: "Чт", date: "17 окт" },
  { dayLabel: "Пт", date: "18 окт" },
  { dayLabel: "Сб", date: "19 окт" },
  { dayLabel: "Вс", date: "20 окт" },
];

const times = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

const busy = new Set([
  "Вт-10:00",
  "Вт-12:00",
  "Вт-15:00",
  "Ср-11:00",
  "Чт-14:00",
  "Пт-16:00",
  "Сб-12:00",
]);

export const timeSlots: TimeSlot[] = days.flatMap((day) =>
  times.map((time) => ({
    id: `${day.dayLabel}-${time}`,
    dayLabel: day.dayLabel,
    date: day.date,
    time,
    available: !busy.has(`${day.dayLabel}-${time}`),
  })),
);

export const defaultClientBookings: ClientBooking[] = [
  {
    id: "b1",
    date: "16 октября",
    time: "15:00",
    psychologistName,
  },
  {
    id: "b2",
    date: "22 октября",
    time: "11:00",
    psychologistName,
  },
];

export const bookingLink = "https://t.me/calendar_choose_bot";
