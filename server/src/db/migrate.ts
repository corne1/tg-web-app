import type { Client } from "@libsql/client";
import { SERVICE_TYPE_CODES } from "./serviceTypeSeed.js";
import { ensureIdealEmptySchema, seedServiceTypes } from "./schema.js";
import { enableForeignKeys, getDb } from "./client.js";

let migrateTask: Promise<void> | null = null;

async function tableExists(db: Client, name: string): Promise<boolean> {
  const r = await db.execute({
    sql: `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`,
    args: [name],
  });
  return Boolean(r.rows[0]);
}

async function getSchemaVersion(db: Client): Promise<number> {
  await db.execute(
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
  return SERVICE_TYPE_CODES.has(code) ? code : null;
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
      is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0, 1)),
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
    await db.execute(`DROP TABLE IF EXISTS ${name}`);
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
        timezone, cancel_hours, client_cancel_enabled, client_reschedule_enabled,
        reschedule_hours, status, onboarding_step, onboarding_completed_at,
        avatar_url, about_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        row.client_cancel_enabled != null
          ? Number(row.client_cancel_enabled) ? 1 : 0
          : 1,
        row.client_reschedule_enabled != null
          ? Number(row.client_reschedule_enabled) ? 1 : 0
          : 1,
        Number(row.reschedule_hours ?? row.cancel_hours ?? 24),
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
  await db.execute(
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
  await setSchemaVersion(db, 2);
}

const KNOWN_TABLES = new Set(["users", "master_profiles"]);

const V3_COLUMNS = [
  ["client_cancel_enabled", "INTEGER NOT NULL DEFAULT 1"],
  ["client_reschedule_enabled", "INTEGER NOT NULL DEFAULT 1"],
  ["reschedule_hours", "INTEGER NOT NULL DEFAULT 24"],
] as const;

/** Additive booking-rules columns on master_profiles (Figma 21455:21865). */
async function migrateToV3(db: Client): Promise<void> {
  for (const [name, ddl] of V3_COLUMNS) {
    if (await columnExists(db, "master_profiles", name)) continue;
    await db.execute(`ALTER TABLE master_profiles ADD COLUMN ${name} ${ddl}`);
  }
  await setSchemaVersion(db, 3);
}

async function columnExists(
  db: Client,
  table: string,
  column: string,
): Promise<boolean> {
  if (!KNOWN_TABLES.has(table)) {
    throw new Error(`Unexpected table in columnExists: ${table}`);
  }
  const info = await db.execute(`PRAGMA table_info(${table})`);
  return info.rows.some((row) => String(row.name) === column);
}

/** users.is_test is set in the database. Login must not change it. */
async function migrateToV4(db: Client): Promise<void> {
  if (!(await columnExists(db, "users", "is_test"))) {
    await db.execute(
      `ALTER TABLE users ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0, 1))`,
    );
  }
  await setSchemaVersion(db, 4);
}

async function runMigrate(): Promise<void> {
  const db = getDb();
  await enableForeignKeys(db);

  await db.execute(
    `CREATE TABLE IF NOT EXISTS schema_meta (
      version INTEGER NOT NULL,
      applied_at TEXT NOT NULL
    )`,
  );

  let version = await getSchemaVersion(db);

  if (version < 2) {
    await migrateToV2(db);
    version = 2;
  }
  if (version < 3) {
    await migrateToV3(db);
    version = 3;
  }
  if (version < 4) {
    await migrateToV4(db);
    version = 4;
  }

  await ensureIdealEmptySchema(db);
  await seedServiceTypes(db);

  void version;
}

export function migrate(): Promise<void> {
  if (!migrateTask) {
    migrateTask = runMigrate().catch((err) => {
      migrateTask = null;
      throw err;
    });
  }
  return migrateTask;
}

export async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  await migrate();
  const db = getDb();
  await enableForeignKeys(db);
  return fn(db);
}

