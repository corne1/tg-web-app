import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

let client: Client | null = null;
let migrated = false;

/** Keep in sync with `SERVICE_TYPE_SEED` in serviceTypes.ts */
const SERVICE_TYPE_SEED: ReadonlyArray<{
  code: string;
  label: string;
  title: string;
  sortOrder: number;
}> = [
  { code: "manicure", label: "Маникюр", title: "мастер маникюра", sortOrder: 1 },
  { code: "brows", label: "Брови", title: "мастер бровей", sortOrder: 2 },
  { code: "lashes", label: "Ресницы", title: "мастер ресниц", sortOrder: 3 },
  { code: "hair", label: "Волосы", title: "мастер по волосам", sortOrder: 4 },
  { code: "makeup", label: "Макияж", title: "визажист", sortOrder: 5 },
];

const SCHEMA_VERSION = 2;

function resolveDatabaseUrl(): string {
  if (config.databaseUrl) return config.databaseUrl;

  const isServerless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
  );
  if (isServerless) {
    throw new Error(
      "DATABASE_URL is required on Vercel. Create a free Turso DB and set DATABASE_URL + DATABASE_AUTH_TOKEN.",
    );
  }

  const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../data");
  mkdirSync(dataDir, { recursive: true });
  const dbFile = resolve(dataDir, "app.db").replace(/\\/g, "/");
  return `file:${dbFile}`;
}

async function enableForeignKeys(db: Client): Promise<void> {
  await db.execute("PRAGMA foreign_keys = ON");
}

export function getDb(): Client {
  if (!client) {
    client = createClient({
      url: resolveDatabaseUrl(),
      authToken: config.databaseAuthToken,
    });
  }
  return client;
}

async function tryExec(db: Client, sql: string): Promise<void> {
  try {
    await db.execute(sql);
  } catch {
    // ignore (exists / already migrated)
  }
}

async function tableExists(db: Client, name: string): Promise<boolean> {
  const r = await db.execute({
    sql: `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`,
    args: [name],
  });
  return Boolean(r.rows[0]);
}

async function getSchemaVersion(db: Client): Promise<number> {
  await tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS schema_meta (
      version INTEGER NOT NULL,
      applied_at TEXT NOT NULL
    )`,
  );
  const r = await db.execute(`SELECT MAX(version) AS v FROM schema_meta`);
  const v = r.rows[0]?.v;
  return v == null ? 0 : Number(v);
}

async function setSchemaVersion(db: Client, version: number): Promise<void> {
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO schema_meta (version, applied_at) VALUES (?, ?)`,
    args: [version, now],
  });
}

async function seedServiceTypes(db: Client): Promise<void> {
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

function createIdealSchemaSql(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT,
      username TEXT,
      language_code TEXT,
      is_premium INTEGER NOT NULL DEFAULT 0 CHECK (is_premium IN (0, 1)),
      photo_url TEXT,
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

function createIdealIndexesSql(): string[] {
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

async function ensureIdealEmptySchema(db: Client): Promise<void> {
  await db.batch(createIdealSchemaSql(), "write");
  for (const sql of createIdealIndexesSql()) {
    await tryExec(db, sql);
  }
}

function parseLegacyTitles(raw: unknown): string[] {
  if (raw == null) return [];
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t) => String(t).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function validTypeCode(code: string | null): string | null {
  if (!code) return null;
  return SERVICE_TYPE_SEED.some((s) => s.code === code) ? code : null;
}

/**
 * Destructive rebuild → ideal relational schema (v2).
 * Copies legacy data, then drops old tables.
 */
async function migrateToV2(db: Client): Promise<void> {
  await enableForeignKeys(db);

  // Detach FK while reshaping.
  await db.execute("PRAGMA foreign_keys = OFF");

  const hasOldProfiles = await tableExists(db, "master_profiles");
  const hasOldBookings = await tableExists(db, "bookings");
  const hasOldServices = await tableExists(db, "master_services");
  const hasOldClients = await tableExists(db, "master_clients");
  const hasOldNotes = await tableExists(db, "client_notes");
  const hasUsers = await tableExists(db, "users");

  if (!hasUsers) {
    await db.execute(`CREATE TABLE users (
      id INTEGER PRIMARY KEY NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT,
      username TEXT,
      language_code TEXT,
      is_premium INTEGER NOT NULL DEFAULT 0,
      photo_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    )`);
  }

  // Snapshot old data
  const oldProfiles = hasOldProfiles
    ? (await db.execute(`SELECT * FROM master_profiles`)).rows
    : [];
  const oldServices = hasOldServices
    ? (await db.execute(`SELECT * FROM master_services`)).rows
    : [];
  const oldClients = hasOldClients
    ? (await db.execute(`SELECT * FROM master_clients`)).rows
    : [];
  const oldNotes = hasOldNotes
    ? (await db.execute(`SELECT * FROM client_notes`)).rows
    : [];
  const oldBookings = hasOldBookings
    ? (await db.execute(`SELECT * FROM bookings`)).rows
    : [];

  // Drop dependent objects (order matters with FK off)
  for (const name of [
    "booking_services",
    "bookings",
    "client_notes",
    "master_clients",
    "master_services",
    "master_profiles",
    "service_types",
  ]) {
    await tryExec(db, `DROP TABLE IF EXISTS ${name}`);
  }

  await ensureIdealEmptySchema(db);
  await seedServiceTypes(db);

  const now = new Date().toISOString();
  const profileIds = new Set<number>();

  for (const row of oldProfiles) {
    const userId = Number(row.user_id);
    profileIds.add(userId);
    const specialtyRaw =
      row.service_type_code != null
        ? String(row.service_type_code)
        : row.specialty != null
          ? String(row.specialty)
          : null;
    await db.execute({
      sql: `INSERT INTO master_profiles (
        user_id, slug, name, service_type_code, city, schedule,
        working_hours_json, day_break_min, travel_buffer_min, place_json,
        timezone, cancel_hours, status, onboarding_step, onboarding_completed_at,
        avatar_url, about_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        userId,
        String(row.slug ?? `m${userId}`),
        String(row.name ?? ""),
        validTypeCode(specialtyRaw),
        String(row.city ?? "Москва"),
        String(row.schedule ?? "weekday"),
        row.working_hours_json != null ? String(row.working_hours_json) : null,
        row.day_break_min != null ? Number(row.day_break_min) : null,
        row.travel_buffer_min != null ? Number(row.travel_buffer_min) : null,
        row.place_json != null ? String(row.place_json) : null,
        String(row.timezone ?? "Europe/Moscow"),
        Number(row.cancel_hours ?? 24),
        String(row.status ?? "draft") === "active" ? "active" : "draft",
        Number(row.onboarding_step ?? 1),
        row.onboarding_completed_at != null
          ? String(row.onboarding_completed_at)
          : null,
        row.avatar_url != null ? String(row.avatar_url) : null,
        row.about_text != null ? String(row.about_text) : null,
        String(row.created_at ?? now),
        String(row.updated_at ?? now),
      ],
    });
  }

  // Ensure profiles exist for any orphaned master_id references.
  async function ensureProfileStub(masterId: number): Promise<void> {
    if (profileIds.has(masterId)) return;
    // Ensure user row exists
    const u = await db.execute({
      sql: `SELECT id FROM users WHERE id = ?`,
      args: [masterId],
    });
    if (!u.rows[0]) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO users (
          id, first_name, last_name, username, language_code, is_premium,
          photo_url, created_at, updated_at, last_seen_at
        ) VALUES (?, 'Master', NULL, NULL, NULL, 0, NULL, ?, ?, ?)`,
        args: [masterId, now, now, now],
      });
    }
    await db.execute({
      sql: `INSERT OR IGNORE INTO master_profiles (
        user_id, slug, name, service_type_code, city, schedule,
        timezone, cancel_hours, status, onboarding_step,
        created_at, updated_at
      ) VALUES (?, ?, 'Мастер', NULL, 'Москва', 'weekday',
        'Europe/Moscow', 24, 'draft', 1, ?, ?)`,
      args: [masterId, `m${masterId}`, now, now],
    });
    profileIds.add(masterId);
  }

  for (const row of oldServices) {
    const masterId = Number(row.master_id);
    await ensureProfileStub(masterId);
    const typeCode =
      validTypeCode(
        row.service_type_code != null ? String(row.service_type_code) : null,
      ) ?? null;
    await db.execute({
      sql: `INSERT INTO master_services (
        id, master_id, service_type_code, title, duration_min, price, price_mode,
        break_after_min, description, sort_order, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [
        String(row.id),
        masterId,
        typeCode,
        String(row.title ?? "Услуга"),
        Math.max(1, Number(row.duration_min ?? 60)),
        Math.max(0, Number(row.price ?? 0)),
        row.price_mode === "from" ? "from" : "fixed",
        Math.max(0, Number(row.break_after_min ?? 0)),
        String(row.description ?? ""),
        Number(row.sort_order ?? 0),
        String(row.created_at ?? now),
        String(row.updated_at ?? now),
      ],
    });
  }

  for (const row of oldClients) {
    const masterId = Number(row.master_id);
    await ensureProfileStub(masterId);
    await db.execute({
      sql: `INSERT INTO master_clients (
        id, master_id, telegram_user_id, name, phone, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        String(row.id),
        masterId,
        row.telegram_user_id != null ? Number(row.telegram_user_id) : null,
        String(row.name ?? "Клиент"),
        String(row.phone ?? ""),
        String(row.created_at ?? now),
        String(row.updated_at ?? now),
      ],
    });
  }

  for (const row of oldNotes) {
    const masterId = Number(row.master_id);
    await ensureProfileStub(masterId);
    const created = String(row.created_at ?? now);
    const updated =
      row.updated_at != null && String(row.updated_at).trim()
        ? String(row.updated_at)
        : created;
    await db.execute({
      sql: `INSERT INTO client_notes (
        id, master_id, client_id, title, body, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        String(row.id),
        masterId,
        String(row.client_id),
        String(row.title ?? "Заметка"),
        String(row.body ?? ""),
        created,
        updated,
      ],
    });
  }

  for (const row of oldBookings) {
    const masterId = Number(row.master_id);
    await ensureProfileStub(masterId);
    const bookingId = String(row.id);
    const titles = parseLegacyTitles(row.services_json);
    const durationMin = Math.max(1, Number(row.duration_min ?? 60));
    const price = Math.max(0, Number(row.price ?? 0));
    const masterClientId =
      row.master_client_id != null ? String(row.master_client_id) : null;

    // Validate master_client ownership
    let safeClientId: string | null = masterClientId;
    if (safeClientId) {
      const own = await db.execute({
        sql: `SELECT id FROM master_clients WHERE id = ? AND master_id = ?`,
        args: [safeClientId, masterId],
      });
      if (!own.rows[0]) safeClientId = null;
    }

    await db.execute({
      sql: `INSERT INTO bookings (
        id, master_id, client_id, master_client_id, starts_at, duration_min, price,
        price_from, status, paid, client_name, place_choice, place_address,
        client_comment, visit_json, reminded_24h, reminded_1h, access_token,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?)`,
      args: [
        bookingId,
        masterId,
        Number(row.client_id),
        safeClientId,
        String(row.starts_at),
        durationMin,
        price,
        String(row.status ?? "confirmed"),
        Number(row.paid ?? 0) ? 1 : 0,
        String(row.client_name ?? "Клиент"),
        Number(row.reminded_24h ?? 0) ? 1 : 0,
        Number(row.reminded_1h ?? 0) ? 1 : 0,
        row.access_token != null ? String(row.access_token) : null,
        String(row.created_at ?? now),
        String(row.updated_at ?? now),
      ],
    });

    if (titles.length === 0) {
      await db.execute({
        sql: `INSERT INTO booking_services (
          id, booking_id, service_id, sort_order, title, duration_min,
          break_after_min, price, price_mode, created_at
        ) VALUES (?, ?, NULL, 0, 'Услуга', ?, 0, ?, 'fixed', ?)`,
        args: [
          `${bookingId}:0`,
          bookingId,
          durationMin,
          price,
          String(row.created_at ?? now),
        ],
      });
    } else {
      const per = Math.floor(price / titles.length);
      const rem = price - per * titles.length;
      const perDur = Math.max(1, Math.floor(durationMin / titles.length));
      for (let i = 0; i < titles.length; i++) {
        await db.execute({
          sql: `INSERT INTO booking_services (
            id, booking_id, service_id, sort_order, title, duration_min,
            break_after_min, price, price_mode, created_at
          ) VALUES (?, ?, NULL, ?, ?, ?, 0, ?, 'fixed', ?)`,
          args: [
            `${bookingId}:${i}`,
            bookingId,
            i,
            titles[i]!,
            i === 0 ? durationMin - perDur * (titles.length - 1) : perDur,
            i === 0 ? per + rem : per,
            String(row.created_at ?? now),
          ],
        });
      }
    }
  }

  // Backfill service_type_code on services from profile
  await tryExec(
    db,
    `UPDATE master_services
      SET service_type_code = (
        SELECT p.service_type_code FROM master_profiles p
        WHERE p.user_id = master_services.master_id
      )
      WHERE service_type_code IS NULL
        AND EXISTS (
          SELECT 1 FROM master_profiles p
          WHERE p.user_id = master_services.master_id
            AND p.service_type_code IS NOT NULL
        )`,
  );

  await enableForeignKeys(db);
  await setSchemaVersion(db, SCHEMA_VERSION);
}

async function migrateLegacyV0toV1Markers(db: Client): Promise<void> {
  // Soft path if somehow still on fragmented additive schema without schema_meta.
  // Handled by migrateToV2 rebuild.
  void db;
}

export async function migrate(): Promise<void> {
  if (migrated) return;
  const db = getDb();
  await enableForeignKeys(db);

  await tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS schema_meta (
      version INTEGER NOT NULL,
      applied_at TEXT NOT NULL
    )`,
  );

  let version = await getSchemaVersion(db);

  // Fresh DB or pre-versioned DB: always land on ideal v2.
  if (version < SCHEMA_VERSION) {
    await migrateLegacyV0toV1Markers(db);
    await migrateToV2(db);
    version = SCHEMA_VERSION;
  } else {
    // Idempotent seed / indexes for already-v2 databases.
    await ensureIdealEmptySchema(db);
    await seedServiceTypes(db);
  }

  void version;
  migrated = true;
}

export async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  await migrate();
  const db = getDb();
  await enableForeignKeys(db);
  return fn(db);
}
