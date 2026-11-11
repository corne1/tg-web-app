import { clientBookingDeepLink } from "../config.js";
import {
  canCancelBooking,
  canRescheduleBooking,
} from "./bookingRules.js";
import { bookingServiceTitles } from "../db/bookings.js";
import type { BookingRow, MasterProfileRow } from "../db/types.js";
import { formatDateLabel, formatTime } from "../services/time.js";

function ruHoursLabel(hours: number): string {
  const n = Math.max(0, Math.round(hours));
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "часов";
  if (mod10 === 1 && mod100 !== 11) word = "час";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    word = "часа";
  return `${n} ${word}`;
}

export function serializeClientBooking(
  booking: BookingRow,
  profile: MasterProfileRow | null,
) {
  const tz = profile?.timezone ?? "Europe/Moscow";
  const cancelHours = profile?.cancel_hours ?? 24;
  const active = booking.status !== "cancelled";
  const cancelCheck = active
    ? canCancelBooking({
        startsAt: booking.starts_at,
        cancelHours,
        actorIsClient: true,
      })
    : { ok: false as const, reason: "cancelled" };
  const rescheduleCheck = active
    ? canRescheduleBooking({
        startsAt: booking.starts_at,
        cancelHours,
      })
    : { ok: false as const, reason: "cancelled" };

  const cancelBlockedReason = !cancelCheck.ok
    ? cancelCheck.reason === "cancelled"
      ? "Запись уже отменена"
      : `Самостоятельная отмена недоступна менее чем за ${ruHoursLabel(cancelHours)} до визита. Свяжитесь с мастером.`
    : null;
  const rescheduleBlockedReason = !rescheduleCheck.ok
    ? rescheduleCheck.reason === "cancelled"
      ? "Запись уже отменена"
      : `Самостоятельный перенос недоступен менее чем за ${ruHoursLabel(cancelHours)} до визита. Свяжитесь с мастером.`
    : null;

  const accessToken = booking.access_token;
  const titles = bookingServiceTitles(booking);
  const priceLabel = booking.price_from
    ? `от ${booking.price.toLocaleString("ru-RU")} ₽`
    : `${booking.price.toLocaleString("ru-RU")} ₽`;

  return {
    id: booking.id,
    startsAt: booking.starts_at,
    date: formatDateLabel(booking.starts_at, tz),
    time: formatTime(booking.starts_at, tz),
    masterId: booking.master_id,
    masterName: profile?.name ?? "Мастер",
    masterAvatarUrl: profile?.avatar_url ?? null,
    duration: booking.duration_min,
    price: booking.price,
    priceLabel,
    status: booking.status,
    cancelHours,
    serviceTitles: titles,
    clientName: booking.client_name,
    placeChoice: booking.place_choice,
    placeAddress: booking.place_address,
    comment: booking.client_comment,
    canCancel: cancelCheck.ok,
    canReschedule: rescheduleCheck.ok,
    cancelBlockedReason,
    rescheduleBlockedReason,
    accessToken,
    bookingLink: accessToken ? clientBookingDeepLink(accessToken) : null,
  };
}
