import { randomUUID } from "node:crypto";
import {
  canCancelBooking,
  canRescheduleBooking,
} from "../lib/bookingRules.js";
import { withDb } from "./client.js";
import type { BookingRow, BookingStatus } from "./types.js";

function mapBooking(row: Record<string, unknown>): BookingRow {
  return {
    id: String(row.id),
    master_id: Number(row.master_id),
    client_id: Number(row.client_id),
    starts_at: String(row.starts_at),
    duration_min: Number(row.duration_min),
    price: Number(row.price),
    status: String(row.status) as BookingStatus,
    paid: Boolean(row.paid),
    client_name: String(row.client_name),
    reminded_24h: Boolean(row.reminded_24h),
    reminded_1h: Boolean(row.reminded_1h),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export type CreateBookingInput = {
  masterId: number;
  clientId: number;
  clientName: string;
  startsAt: string;
  durationMin: number;
  price: number;
};

export async function createBooking(
  input: CreateBookingInput,
): Promise<BookingRow> {
  return withDb(async (db) => {
    const now = new Date().toISOString();
    const id = randomUUID();
    const status: BookingStatus = "confirmed";

    try {
      await db.execute({
        sql: `INSERT INTO bookings (
          id, master_id, client_id, starts_at, duration_min, price,
          status, paid, client_name, reminded_24h, reminded_1h, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, ?, ?)`,
        args: [
          id,
          input.masterId,
          input.clientId,
          input.startsAt,
          input.durationMin,
          input.price,
          status,
          input.clientName,
          now,
          now,
        ],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes("unique")) {
        throw new BookingConflictError("Slot already booked");
      }
      throw err;
    }

    return {
      id,
      master_id: input.masterId,
      client_id: input.clientId,
      starts_at: input.startsAt,
      duration_min: input.durationMin,
      price: input.price,
      status,
      paid: false,
      client_name: input.clientName,
      reminded_24h: false,
      reminded_1h: false,
      created_at: now,
      updated_at: now,
    };
  });
}

export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingConflictError";
  }
}

export class BookingRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingRuleError";
  }
}

export async function getBooking(id: string): Promise<BookingRow | null> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: "SELECT * FROM bookings WHERE id = ?",
      args: [id],
    });
    const row = result.rows[0];
    return row ? mapBooking(row as unknown as Record<string, unknown>) : null;
  });
}

export async function listActiveStarts(
  masterId: number,
  fromIso: string,
  toIso: string,
): Promise<Set<string>> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT starts_at FROM bookings
        WHERE master_id = ?
          AND status != 'cancelled'
          AND starts_at >= ?
          AND starts_at < ?`,
      args: [masterId, fromIso, toIso],
    });
    return new Set(result.rows.map((r) => String(r.starts_at)));
  });
}

export async function listMasterBookings(
  masterId: number,
  fromIso: string,
  toIso: string,
): Promise<BookingRow[]> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT * FROM bookings
        WHERE master_id = ?
          AND starts_at >= ?
          AND starts_at < ?
        ORDER BY starts_at ASC`,
      args: [masterId, fromIso, toIso],
    });
    return result.rows.map((r) =>
      mapBooking(r as unknown as Record<string, unknown>),
    );
  });
}

export async function listClientBookings(
  clientId: number,
): Promise<BookingRow[]> {
  return withDb(async (db) => {
    const now = new Date().toISOString();
    const result = await db.execute({
      sql: `SELECT * FROM bookings
        WHERE client_id = ?
          AND status != 'cancelled'
          AND starts_at >= ?
        ORDER BY starts_at ASC`,
      args: [clientId, now],
    });
    return result.rows.map((r) =>
      mapBooking(r as unknown as Record<string, unknown>),
    );
  });
}

export async function cancelBooking(
  id: string,
  actorId: number,
  cancelHours: number,
): Promise<BookingRow> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: "SELECT * FROM bookings WHERE id = ?",
      args: [id],
    });
    const row = result.rows[0];
    if (!row) throw new BookingRuleError("Booking not found");
    const booking = mapBooking(row as unknown as Record<string, unknown>);

    if (booking.client_id !== actorId && booking.master_id !== actorId) {
      throw new BookingRuleError("Forbidden");
    }
    if (booking.status === "cancelled") {
      throw new BookingRuleError("Already cancelled");
    }

    const cancelCheck = canCancelBooking({
      startsAt: booking.starts_at,
      cancelHours,
      actorIsClient: booking.client_id === actorId,
    });
    if (!cancelCheck.ok) {
      throw new BookingRuleError(cancelCheck.reason);
    }

    const now = new Date().toISOString();
    await db.execute({
      sql: `UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?`,
      args: [now, id],
    });
    return { ...booking, status: "cancelled", updated_at: now };
  });
}

export async function rescheduleBooking(
  id: string,
  actorId: number,
  newStartsAt: string,
  cancelHours: number,
): Promise<BookingRow> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: "SELECT * FROM bookings WHERE id = ?",
      args: [id],
    });
    const row = result.rows[0];
    if (!row) throw new BookingRuleError("Booking not found");
    const booking = mapBooking(row as unknown as Record<string, unknown>);

    if (booking.client_id !== actorId) {
      throw new BookingRuleError("Forbidden");
    }
    if (booking.status === "cancelled") {
      throw new BookingRuleError("Booking cancelled");
    }

    const rescheduleCheck = canRescheduleBooking({
      startsAt: booking.starts_at,
      cancelHours,
    });
    if (!rescheduleCheck.ok) {
      throw new BookingRuleError(rescheduleCheck.reason);
    }

    const now = new Date().toISOString();
    try {
      await db.execute({
        sql: `UPDATE bookings SET starts_at = ?, updated_at = ?, reminded_24h = 0, reminded_1h = 0 WHERE id = ?`,
        args: [newStartsAt, now, id],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes("unique")) {
        throw new BookingConflictError("Slot already booked");
      }
      throw err;
    }

    return {
      ...booking,
      starts_at: newStartsAt,
      updated_at: now,
      reminded_24h: false,
      reminded_1h: false,
    };
  });
}

export async function markPaid(
  id: string,
  masterId: number,
): Promise<BookingRow> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: "SELECT * FROM bookings WHERE id = ?",
      args: [id],
    });
    const row = result.rows[0];
    if (!row) throw new BookingRuleError("Booking not found");
    const booking = mapBooking(row as unknown as Record<string, unknown>);

    if (booking.master_id !== masterId) {
      throw new BookingRuleError("Forbidden");
    }
    if (booking.status === "cancelled") {
      throw new BookingRuleError("Booking cancelled");
    }

    const now = new Date().toISOString();
    await db.execute({
      sql: `UPDATE bookings SET paid = 1, status = 'paid', updated_at = ? WHERE id = ?`,
      args: [now, id],
    });
    return { ...booking, paid: true, status: "paid", updated_at: now };
  });
}

export type ReminderCandidate = BookingRow & {
  master_name: string;
  master_timezone: string;
  client_telegram_id: number;
  master_telegram_id: number;
};

export async function listDueReminders(
  kind: "24h" | "1h",
  now = new Date(),
): Promise<ReminderCandidate[]> {
  const windowMs = kind === "24h" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const slackMs = kind === "24h" ? 60 * 60 * 1000 : 15 * 60 * 1000;
  const from = new Date(now.getTime() + windowMs - slackMs).toISOString();
  const to = new Date(now.getTime() + windowMs + slackMs).toISOString();
  const flagCol = kind === "24h" ? "reminded_24h" : "reminded_1h";

  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT b.*, p.name AS master_name, p.timezone AS master_timezone
        FROM bookings b
        JOIN master_profiles p ON p.user_id = b.master_id
        WHERE b.status != 'cancelled'
          AND b.${flagCol} = 0
          AND b.starts_at >= ?
          AND b.starts_at < ?`,
      args: [from, to],
    });

    return result.rows.map((r) => {
      const base = mapBooking(r as unknown as Record<string, unknown>);
      return {
        ...base,
        master_name: String(r.master_name),
        master_timezone: String(r.master_timezone),
        client_telegram_id: base.client_id,
        master_telegram_id: base.master_id,
      };
    });
  });
}

export async function markReminded(
  id: string,
  kind: "24h" | "1h",
): Promise<void> {
  const col = kind === "24h" ? "reminded_24h" : "reminded_1h";
  await withDb(async (db) => {
    await db.execute({
      sql: `UPDATE bookings SET ${col} = 1, updated_at = ? WHERE id = ?`,
      args: [new Date().toISOString(), id],
    });
  });
}
