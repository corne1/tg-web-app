import type { Client } from "@libsql/client";
import type { BookingPlaceChoice, BookingRow, BookingServiceRow, BookingStatus } from "./types.js";

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
  db: Client,
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

export async function hydrateBookings(
  db: Client,
  rows: Record<string, unknown>[],
): Promise<BookingRow[]> {
  const ids = rows.map((row) => String(row.id));
  const servicesMap = await loadServicesForBookings(db, ids);
  return rows.map((row) =>
    mapBooking(row, servicesMap.get(String(row.id)) ?? []),
  );
}

export function bookingServiceTitles(booking: BookingRow): string[] {
  return booking.services.map((service) => service.title).filter(Boolean);
}
