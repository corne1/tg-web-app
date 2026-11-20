import type { Client } from "@libsql/client";
import { SERVICE_TYPE_SEED } from "./serviceTypeSeed.js";

export async function seedServiceTypes(db: Client): Promise<void> {
  const now = new Date().toISOString();
  for (const item of SERVICE_TYPE_SEED) {
    await db.execute({
      sql: `INSERT INTO service_types (
        code, label, title, sort_order, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        label = excluded.label,
        title = excluded.title,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at`,
      args: [item.code, item.label, item.title, item.sortOrder, now, now],
    });
  }
}

export function createIdealSchemaSql(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT,
      username TEXT,
      language_code TEXT,
      is_premium INTEGER NOT NULL DEFAULT 0 CHECK (is_premium IN (0, 1)),
      photo_url TEXT,
      is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS service_types (
      code TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS master_profiles (
      user_id INTEGER PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      service_type_code TEXT REFERENCES service_types(code) ON DELETE RESTRICT,
      city TEXT NOT NULL DEFAULT 'Москва',
      schedule TEXT NOT NULL DEFAULT 'weekday'
        CHECK (schedule IN ('weekday', 'weekend', 'manual')),
      working_hours_json TEXT,
      day_break_min INTEGER CHECK (day_break_min IS NULL OR day_break_min >= 0),
      travel_buffer_min INTEGER CHECK (travel_buffer_min IS NULL OR (travel_buffer_min >= 0 AND travel_buffer_min <= 240)),
      place_json TEXT,
      timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
      cancel_hours INTEGER NOT NULL DEFAULT 24 CHECK (cancel_hours >= 0),
      client_cancel_enabled INTEGER NOT NULL DEFAULT 1 CHECK (client_cancel_enabled IN (0, 1)),
      client_reschedule_enabled INTEGER NOT NULL DEFAULT 1 CHECK (client_reschedule_enabled IN (0, 1)),
      reschedule_hours INTEGER NOT NULL DEFAULT 24 CHECK (reschedule_hours >= 0),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active')),
      onboarding_step INTEGER NOT NULL DEFAULT 1 CHECK (onboarding_step >= 1),
      onboarding_completed_at TEXT,
      avatar_url TEXT,
      about_text TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS master_services (
      id TEXT PRIMARY KEY NOT NULL,
      master_id INTEGER NOT NULL REFERENCES master_profiles(user_id) ON DELETE CASCADE,
      service_type_code TEXT REFERENCES service_types(code) ON DELETE SET NULL,
      title TEXT NOT NULL CHECK (length(trim(title)) > 0),
      duration_min INTEGER NOT NULL CHECK (duration_min > 0),
      price INTEGER NOT NULL CHECK (price >= 0),
      price_mode TEXT NOT NULL DEFAULT 'fixed' CHECK (price_mode IN ('fixed', 'from')),
      break_after_min INTEGER NOT NULL DEFAULT 0 CHECK (break_after_min >= 0),
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS master_clients (
      id TEXT PRIMARY KEY NOT NULL,
      master_id INTEGER NOT NULL REFERENCES master_profiles(user_id) ON DELETE CASCADE,
      telegram_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      phone TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS client_notes (
      id TEXT PRIMARY KEY NOT NULL,
      master_id INTEGER NOT NULL REFERENCES master_profiles(user_id) ON DELETE CASCADE,
      client_id TEXT NOT NULL REFERENCES master_clients(id) ON DELETE CASCADE,
      title TEXT NOT NULL CHECK (length(trim(title)) > 0),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY NOT NULL,
      master_id INTEGER NOT NULL REFERENCES master_profiles(user_id),
      client_id INTEGER NOT NULL REFERENCES users(id),
      master_client_id TEXT REFERENCES master_clients(id) ON DELETE SET NULL,
      starts_at TEXT NOT NULL,
      duration_min INTEGER NOT NULL CHECK (duration_min > 0),
      price INTEGER NOT NULL CHECK (price >= 0),
      price_from INTEGER NOT NULL DEFAULT 0 CHECK (price_from IN (0, 1)),
      status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'paid')),
      paid INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0, 1)),
      client_name TEXT NOT NULL,
      place_choice TEXT CHECK (place_choice IS NULL OR place_choice IN ('studio', 'visit')),
      place_address TEXT,
      client_comment TEXT,
      visit_json TEXT,
      reminded_24h INTEGER NOT NULL DEFAULT 0 CHECK (reminded_24h IN (0, 1)),
      reminded_1h INTEGER NOT NULL DEFAULT 0 CHECK (reminded_1h IN (0, 1)),
      access_token TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS booking_services (
      id TEXT PRIMARY KEY NOT NULL,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      service_id TEXT REFERENCES master_services(id) ON DELETE SET NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL CHECK (length(trim(title)) > 0),
      duration_min INTEGER NOT NULL CHECK (duration_min > 0),
      break_after_min INTEGER NOT NULL DEFAULT 0 CHECK (break_after_min >= 0),
      price INTEGER NOT NULL CHECK (price >= 0),
      price_mode TEXT NOT NULL DEFAULT 'fixed' CHECK (price_mode IN ('fixed', 'from')),
      created_at TEXT NOT NULL
    )`,
  ];
}

export function createIdealIndexesSql(): string[] {
  return [
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_master_profiles_slug ON master_profiles(slug)`,
    `CREATE INDEX IF NOT EXISTS idx_master_profiles_type ON master_profiles(service_type_code)`,
    `CREATE INDEX IF NOT EXISTS idx_master_services_master ON master_services(master_id, sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_master_services_type ON master_services(service_type_code)`,
    `CREATE INDEX IF NOT EXISTS idx_master_clients_master ON master_clients(master_id, updated_at)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_master_clients_tg
      ON master_clients(master_id, telegram_user_id)
      WHERE telegram_user_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_client_notes_client
      ON client_notes(master_id, client_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_master_starts ON bookings(master_id, starts_at)`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_client_starts ON bookings(client_id, starts_at)`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_master_client ON bookings(master_id, master_client_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_slot
      ON bookings(master_id, starts_at)
      WHERE status != 'cancelled'`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_access_token
      ON bookings(access_token)
      WHERE access_token IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_booking_services_booking
      ON booking_services(booking_id, sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_service_types_active
      ON service_types(is_active, sort_order)`,
  ];
}

export async function ensureIdealEmptySchema(db: Client): Promise<void> {
  await db.batch(createIdealSchemaSql(), "write");
  for (const sql of createIdealIndexesSql()) {
    await db.execute(sql);
  }
}
