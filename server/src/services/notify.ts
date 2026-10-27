import type { BookingRow } from "../db/types.js";
import { createBot } from "../bot.js";
import { formatDateLabel, formatTime } from "./time.js";

export async function notifyBookingCreated(opts: {
  booking: BookingRow;
  psychologistName: string;
  psychologistTimezone: string;
}): Promise<void> {
  const bot = createBot();
  if (!bot) return;

  const { booking, psychologistName, psychologistTimezone } = opts;
  const when = `${formatDateLabel(booking.starts_at, psychologistTimezone)} · ${formatTime(booking.starts_at, psychologistTimezone)}`;

  try {
    await bot.api.sendMessage(
      booking.psychologist_id,
      `Новая запись: ${booking.client_name}, ${when}.`,
    );
  } catch (err) {
    console.error("[notify] psychologist", err);
  }

  try {
    await bot.api.sendMessage(
      booking.client_id,
      `Вы записаны к ${psychologistName}: ${when}.`,
    );
  } catch (err) {
    console.error("[notify] client", err);
  }
}

export async function notifyBookingCancelled(opts: {
  booking: BookingRow;
  psychologistName: string;
  psychologistTimezone: string;
  by: "client" | "psychologist";
}): Promise<void> {
  const bot = createBot();
  if (!bot) return;

  const when = `${formatDateLabel(opts.booking.starts_at, opts.psychologistTimezone)} · ${formatTime(opts.booking.starts_at, opts.psychologistTimezone)}`;

  const otherId =
    opts.by === "client"
      ? opts.booking.psychologist_id
      : opts.booking.client_id;
  const text =
    opts.by === "client"
      ? `Клиент ${opts.booking.client_name} отменил запись: ${when}.`
      : `Психолог ${opts.psychologistName} отменил вашу запись: ${when}.`;

  try {
    await bot.api.sendMessage(otherId, text);
  } catch (err) {
    console.error("[notify] cancel", err);
  }
}

export async function notifyReminder(opts: {
  clientId: number;
  psychologistName: string;
  startsAt: string;
  timezone: string;
  kind: "24h" | "1h";
}): Promise<void> {
  const bot = createBot();
  if (!bot) return;

  const when = `${formatDateLabel(opts.startsAt, opts.timezone)} · ${formatTime(opts.startsAt, opts.timezone)}`;
  const prefix = opts.kind === "24h" ? "Напоминаем: завтра" : "Напоминаем: через час";
  const text = `${prefix} у вас консультация с ${opts.psychologistName} (${when}).`;

  try {
    await bot.api.sendMessage(opts.clientId, text);
  } catch (err) {
    console.error("[notify] reminder", err);
  }
}
