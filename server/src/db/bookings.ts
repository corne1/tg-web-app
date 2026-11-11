import { randomBytes, randomUUID } from "node:crypto";
import {
  slotConflictsWithBusy,
  type BusyInterval,
} from "../lib/bookingInterval.js";
import {
  canCancelBooking,
  canRescheduleBooking,
} from "../lib/bookingRules.js";
import { withDb } from "./client.js";
import type {
  BookingPlaceChoice,
  BookingRow,
  BookingServiceRow,
  BookingStatus,
} from "./types.js";

export function newBookingAccessToken(): string {
  return randomBytes(18).toString("base64url");
}

function mapBookingService(row: Record<string, unknown>): BookingServiceRow {
  return {
    id: String(row.id),
    booking_id: String(row.booking_id),
    service_id: row.service_id != null ? String(row.service_id) : null,
    sort_order: Number(row.sort_order ?? 0),
    title: String(row.title),
    duration_min: Number(row.duration_min),
    break_after_min: Number(row.break_after_min ?? 0),
    price: Number(row.price),
    price_mode: row.price_mode === "from" ? "from" : "fixed",
    created_at: String(row.created_at),
  };
}

function mapBooking(
  row: Record<string, unknown>,
  services: BookingServiceRow[] = [],
): BookingRow {
  const placeRaw = row.place_choice != null ? String(row.place_choice) : null;
  const placeChoice: BookingPlaceChoice | null =
    placeRaw === "studio" || placeRaw === "visit" ? placeRaw : null;
  return {
    id: String(row.id),
    master_id: Number(row.master_id),
    client_id: Number(row.client_id),
    starts_at: String(row.starts_at),
    duration_min: Number(row.duration_min),
    price: Number(row.price),
    price_from: Boolean(row.price_from),
    status: String(row.status) as BookingStatus,
    paid: Boolean(row.paid),
    client_name: String(row.client_name),
    reminded_24h: Boolean(row.reminded_24h),
    reminded_1h: Boolean(row.reminded_1h),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    master_client_id:
      row.master_client_id != null ? String(row.master_client_id) : null,
    access_token: row.access_token != null ? String(row.access_token) : null,
    place_choice: placeChoice,
    place_address:
      row.place_address != null ? String(row.place_address) : null,
    client_comment:
      row.client_comment != null ? String(row.client_comment) : null,
    visit_json: row.visit_json != null ? String(row.visit_json) : null,
    services,
  };
}

async function loadServicesForBookings(
  db: Parameters<Parameters<typeof withDb>[0]>[0],
  bookingIds: string[],
): Promise<Map<string, BookingServiceRow[]>> {
  const map = new Map<string, BookingServiceRow[]>();
  if (bookingIds.length === 0) return map;
  const placeholders = bookingIds.map(() => "?").join(", ");
  const result = await db.execute({
    sql: `SELECT * FROM booking_services
      WHERE booking_id IN (${placeholders})
      ORDER BY sort_order ASC, created_at ASC`,
    args: bookingIds,
  });
  for (const row of result.rows) {
    const svc = mapBookingService(row as unknown as Record<string, unknown>);
    const list = map.get(svc.booking_id) ?? [];
    list.push(svc);
    map.set(svc.booking_id, list);
  }
  return map;
}

async function hydrateBookings(
  db: Parameters<Parameters<typeof withDb>[0]>[0],
  rows: Record<string, unknown>[],
): Promise<BookingRow[]> {
  const ids = rows.map((r) => String(r.id));
  const servicesMap = await loadServicesForBookings(db, ids);
  return rows.map((r) =>
    mapBooking(r, servicesMap.get(String(r.id)) ?? []),
  );
}

export type BookingServiceInput = {
  serviceId?: string | null;
  title: string;
  durationMin: number;
  breakAfterMin?: number;
  price: number;
  priceMode?: "fixed" | "from";
};

export type CreateBookingInput = {
  masterId: number;
  clientId: number;
  clientName: string;
  startsAt: string;
  /** Ignored — recomputed from `services`. Kept optional for call-site clarity. */
  durationMin?: number;
  /** Ignored — recomputed from `services`. */
  price?: number;
  /** Ignored — recomputed from `services`. */
  priceFrom?: boolean;
  services: BookingServiceInput[];
  masterClientId?: string | null;
  placeChoice?: BookingPlaceChoice | null;
  placeAddress?: string | null;
  clientComment?: string | null;
  visitJson?: unknown;
};

function totalsFromServices(services: BookingServiceInput[]): {
  durationMin: number;
  price: number;
  priceFrom: boolean;
} {
  let durationMin = 0;
  let price = 0;
  let priceFrom = false;
  for (const s of services) {
    durationMin += Math.max(1, s.durationMin) + Math.max(0, s.breakAfterMin ?? 0);
    price += Math.max(0, s.price);
    if (s.priceMode === "from") priceFrom = true;
  }
  return { durationMin, price, priceFrom };
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<BookingRow> {
  return withDb(async (db) => {
    const now = new Date().toISOString();
    const id = randomUUID();
    const accessToken = newBookingAccessToken();
    const status: BookingStatus = "confirmed";
    const services = input.services.filter((s) => s.title.trim());
    if (services.length === 0) {
      throw new Error("At least one booking service required");
    }
    const totals = totalsFromServices(services);

    let masterClientId = input.masterClientId ?? null;
    if (masterClientId) {
      const owned = await db.execute({
        sql: `SELECT id FROM master_clients
          WHERE id = ? AND master_id = ?`,
        args: [masterClientId, input.masterId],
      });
      if (!owned.rows[0]) masterClientId = null;
    }

    const visitJson =
      input.visitJson != null ? JSON.stringify(input.visitJson) : null;

    const newEndIso = new Date(
      Date.parse(input.startsAt) + totals.durationMin * 60_000,
    ).toISOString();
    const candidates = await db.execute({
      sql: `SELECT id, starts_at, duration_min FROM bookings
        WHERE master_id = ?
          AND status != 'cancelled'
          AND starts_at < ?`,
      args: [input.masterId, newEndIso],
    });
    const busy: BusyInterval[] = candidates.rows.map((r) => ({
      id: String(r.id),
      startsAt: String(r.starts_at),
      durationMin: Number(r.duration_min),
    }));
    if (
      slotConflictsWithBusy(input.startsAt, totals.durationMin, busy)
    ) {
      throw new BookingConflictError("Slot already booked");
    }

    const serviceRows: BookingServiceRow[] = services.map((s, i) => ({
      id: randomUUID(),
      booking_id: id,
      service_id: s.serviceId ?? null,
      sort_order: i,
      title: s.title.trim(),
      duration_min: Math.max(1, s.durationMin),
      break_after_min: Math.max(0, s.breakAfterMin ?? 0),
      price: Math.max(0, s.price),
      price_mode: (s.priceMode === "from" ? "from" : "fixed") as "fixed" | "from",
      created_at: now,
    }));

    const statements = [
      {
        sql: `INSERT INTO bookings (
          id, master_id, client_id, master_client_id, starts_at, duration_min, price,
          price_from, status, paid, client_name, place_choice, place_address,
          client_comment, visit_json, reminded_24h, reminded_1h, access_token,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
        args: [
          id,
          input.masterId,
          input.clientId,
          masterClientId,
          input.startsAt,
          totals.durationMin,
          totals.price,
          totals.priceFrom ? 1 : 0,
          status,
          input.clientName,
          input.placeChoice ?? null,
          input.placeAddress ?? null,
          input.clientComment ?? null,
          visitJson,
          accessToken,
          now,
          now,
        ],
      },
      ...serviceRows.map((row) => ({
        sql: `INSERT INTO booking_services (
          id, booking_id, service_id, sort_order, title, duration_min,
          break_after_min, price, price_mode, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          row.id,
          row.booking_id,
          row.service_id,
          row.sort_order,
          row.title,
          row.duration_min,
          row.break_after_min,
          row.price,
          row.price_mode,
          row.created_at,
        ],
      })),
    ];

    try {
      await db.batch(statements, "write");
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
      duration_min: totals.durationMin,
      price: totals.price,
      price_from: totals.priceFrom,
      status,
      paid: false,
      client_name: input.clientName,
      reminded_24h: false,
      reminded_1h: false,
      created_at: now,
      updated_at: now,
      master_client_id: masterClientId,
      access_token: accessToken,
      place_choice: input.placeChoice ?? null,
      place_address: input.placeAddress ?? null,
      client_comment: input.clientComment ?? null,
      visit_json: visitJson,
      services: serviceRows,
    };
  });
}

export async function getBookingByAccessToken(
  token: string,
): Promise<BookingRow | null> {
  const t = token.trim();
  if (!t) return null;
  return withDb(async (db) => {
    const result = await db.execute({
      sql: "SELECT * FROM bookings WHERE access_token = ?",
      args: [t],
    });
    const row = result.rows[0];
    if (!row) return null;
    const [booking] = await hydrateBookings(db, [
      row as unknown as Record<string, unknown>,
    ]);
    return booking ?? null;
  });
}

export async function ensureBookingAccessToken(
  booking: BookingRow,
): Promise<BookingRow> {
  if (booking.access_token) return booking;
  const token = newBookingAccessToken();
  return withDb(async (db) => {
    const now = new Date().toISOString();
    await db.execute({
      sql: `UPDATE bookings SET access_token = ?, updated_at = ?
        WHERE id = ? AND access_token IS NULL`,
      args: [token, now, booking.id],
    });
    return { ...booking, access_token: token, updated_at: now };
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
    if (!row) return null;
    const [booking] = await hydrateBookings(db, [
      row as unknown as Record<string, unknown>,
    ]);
    return booking ?? null;
  });
}

export async function listActiveBusyIntervals(
  masterId: number,
  fromIso: string,
  toIso: string,
  opts?: { excludeBookingId?: string },
): Promise<BusyInterval[]> {
  return withDb(async (db) => {
    // Include bookings that may still be running when `fromIso` starts.
    const lookbackIso = new Date(
      Date.parse(fromIso) - 24 * 60 * 60 * 1000,
    ).toISOString();
    const result = await db.execute({
      sql: `SELECT id, starts_at, duration_min FROM bookings
        WHERE master_id = ?
          AND status != 'cancelled'
          AND starts_at >= ?
          AND starts_at < ?`,
      args: [masterId, lookbackIso, toIso],
    });
    const excludeId = opts?.excludeBookingId;
    const out: BusyInterval[] = [];
    for (const r of result.rows) {
      const id = String(r.id);
      if (excludeId && id === excludeId) continue;
      out.push({
        id,
        startsAt: String(r.starts_at),
        durationMin: Number(r.duration_min),
      });
    }
    return out;
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
    return hydrateBookings(
      db,
      result.rows as unknown as Record<string, unknown>[],
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
    return hydrateBookings(
      db,
      result.rows as unknown as Record<string, unknown>[],
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
    const [booking] = await hydrateBookings(db, [
      row as unknown as Record<string, unknown>,
    ]);
    if (!booking) throw new BookingRuleError("Booking not found");

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
    const [booking] = await hydrateBookings(db, [
      row as unknown as Record<string, unknown>,
    ]);
    if (!booking) throw new BookingRuleError("Booking not found");

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

    const newEndIso = new Date(
      Date.parse(newStartsAt) + booking.duration_min * 60_000,
    ).toISOString();
    const candidates = await db.execute({
      sql: `SELECT id, starts_at, duration_min FROM bookings
        WHERE master_id = ?
          AND status != 'cancelled'
          AND id != ?
          AND starts_at < ?`,
      args: [booking.master_id, id, newEndIso],
    });
    const busy: BusyInterval[] = candidates.rows.map((r) => ({
      id: String(r.id),
      startsAt: String(r.starts_at),
      durationMin: Number(r.duration_min),
    }));
    if (
      slotConflictsWithBusy(newStartsAt, booking.duration_min, busy)
    ) {
      throw new BookingConflictError("Slot already booked");
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
    const [booking] = await hydrateBookings(db, [
      row as unknown as Record<string, unknown>,
    ]);
    if (!booking) throw new BookingRuleError("Booking not found");

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

    const hydrated = await hydrateBookings(
      db,
      result.rows as unknown as Record<string, unknown>[],
    );
    return hydrated.map((base, i) => {
      const r = result.rows[i]!;
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

export function bookingServiceTitles(booking: BookingRow): string[] {
  return booking.services.map((s) => s.title).filter(Boolean);
}
