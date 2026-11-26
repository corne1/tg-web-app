import { InlineKeyboard } from "grammy";
import { clientBookingDeepLink } from "../config.js";
import type { BookingRow } from "../db/types.js";
import { bookingServiceTitles } from "../db/bookingRows.js";
import { createBot } from "../bot.js";
import { formatDateLabel, formatTime } from "./time.js";

function clientBookingCreatedText(opts: {
  masterName: string;
  date: string;
  time: string;
  serviceTitles: string[];
}): string {
  const services =
    opts.serviceTitles.filter((t) => t.trim()).join(", ") || "Услуга";
  return [
    `Вы записаны к мастеру ${opts.masterName}!`,
    "",
    `📅 ${opts.date}`,
    `🕒 ${opts.time}`,
    `💅 ${services}`,
    "",
    "Подробности и управление записью доступны по кнопке ниже.",
  ].join("\n");
}

/**
 * Fire-and-forget after a successful create. Failures are logged only —
 * they must never roll back or block the booking response.
 */
export async function notifyBookingCreated(opts: {
  booking: BookingRow;
  masterName: string;
  masterTimezone: string;
  /** Prefer explicit titles from create payload; falls back to booking.services. */
  serviceTitles?: string[];
}): Promise<void> {
  const bot = createBot();
  if (!bot) return;

  const { booking, masterName, masterTimezone } = opts;
  const date = formatDateLabel(booking.starts_at, masterTimezone);
  const time = formatTime(booking.starts_at, masterTimezone);
  const serviceTitles =
    opts.serviceTitles?.filter((t) => t.trim()) ??
    bookingServiceTitles(booking);

  try {
    await bot.api.sendMessage(
      booking.master_id,
      `Новая запись: ${booking.client_name}, ${date} · ${time}.`,
    );
  } catch (err) {
    console.error("[notify] master", err);
  }

  try {
    const text = clientBookingCreatedText({
      masterName,
      date,
      time,
      serviceTitles,
    });
    const deepLink = booking.access_token
      ? clientBookingDeepLink(booking.access_token)
      : null;
    const reply_markup = deepLink
      ? new InlineKeyboard().url("Моя запись", deepLink)
      : undefined;
    await bot.api.sendMessage(booking.client_id, text, { reply_markup });
  } catch (err) {
    // Bot blocked / user never started bot — booking stays created.
    console.error("[notify] client", err);
  }
}

export async function notifyBookingCancelled(opts: {
  booking: BookingRow;
  masterName: string;
  masterTimezone: string;
  by: "client" | "master";
}): Promise<void> {
  const bot = createBot();
  if (!bot) return;

  const when = `${formatDateLabel(opts.booking.starts_at, opts.masterTimezone)} · ${formatTime(opts.booking.starts_at, opts.masterTimezone)}`;

  const otherId =
    opts.by === "client" ? opts.booking.master_id : opts.booking.client_id;
  const text =
    opts.by === "client"
      ? `Клиент ${opts.booking.client_name} отменил запись: ${when}.`
      : `Мастер ${opts.masterName} отменил вашу запись: ${when}.`;

  try {
    await bot.api.sendMessage(otherId, text);
  } catch (err) {
    console.error("[notify] cancel", err);
  }
}

export async function notifyReminder(opts: {
  clientId: number;
  masterName: string;
  startsAt: string;
  timezone: string;
  kind: "24h" | "1h";
}): Promise<void> {
  const bot = createBot();
  if (!bot) return;

  const when = `${formatDateLabel(opts.startsAt, opts.timezone)} · ${formatTime(opts.startsAt, opts.timezone)}`;
  const prefix = opts.kind === "24h" ? "Напоминаем: завтра" : "Напоминаем: через час";
  const text = `${prefix} у вас консультация с ${opts.masterName} (${when}).`;

  try {
    await bot.api.sendMessage(opts.clientId, text);
  } catch (err) {
    console.error("[notify] reminder", err);
  }
}
