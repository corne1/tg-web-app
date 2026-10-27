import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

let client: Client | null = null;
let migrated = false;

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

export async function migrate(): Promise<void> {
  if (migrated) return;
  const db = getDb();

  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
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
      )`,
      // Legacy table kept for one-time copy into master_profiles.
      `CREATE TABLE IF NOT EXISTS psychologist_profiles (
        user_id INTEGER PRIMARY KEY NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        duration INTEGER NOT NULL,
        price INTEGER NOT NULL,
        schedule TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
        cancel_hours INTEGER NOT NULL DEFAULT 24,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS master_profiles (
        user_id INTEGER PRIMARY KEY NOT NULL REFERENCES users(id),
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT '',
        specialty TEXT,
        city TEXT NOT NULL DEFAULT 'Москва',
        duration INTEGER NOT NULL DEFAULT 60,
        price INTEGER NOT NULL DEFAULT 0,
        schedule TEXT NOT NULL DEFAULT 'weekday',
        timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
        cancel_hours INTEGER NOT NULL DEFAULT 24,
        status TEXT NOT NULL DEFAULT 'draft',
        onboarding_step INTEGER NOT NULL DEFAULT 1,
        onboarding_completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY NOT NULL,
        psychologist_id INTEGER NOT NULL REFERENCES users(id),
        client_id INTEGER NOT NULL REFERENCES users(id),
        starts_at TEXT NOT NULL,
        duration_min INTEGER NOT NULL,
        price INTEGER NOT NULL,
        status TEXT NOT NULL,
        paid INTEGER NOT NULL DEFAULT 0,
        client_name TEXT NOT NULL,
        reminded_24h INTEGER NOT NULL DEFAULT 0,
        reminded_1h INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_bookings_psychologist_starts
        ON bookings(psychologist_id, starts_at)`,
      `CREATE INDEX IF NOT EXISTS idx_bookings_client_starts
        ON bookings(client_id, starts_at)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_slot
        ON bookings(psychologist_id, starts_at)
        WHERE status != 'cancelled'`,
      `CREATE TABLE IF NOT EXISTS master_services (
        id TEXT PRIMARY KEY NOT NULL,
        master_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        duration_min INTEGER NOT NULL,
        price INTEGER NOT NULL,
        price_mode TEXT NOT NULL DEFAULT 'fixed',
        break_after_min INTEGER NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_master_services_master
        ON master_services(master_id, sort_order)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_master_profiles_slug
        ON master_profiles(slug)`,
    ],
    "write",
  );

  for (const sql of [
    `ALTER TABLE psychologist_profiles ADD COLUMN specialty TEXT`,
    `ALTER TABLE psychologist_profiles ADD COLUMN city TEXT NOT NULL DEFAULT 'Москва'`,
    `ALTER TABLE psychologist_profiles ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0`,
  ]) {
    await tryExec(db, sql);
  }

  // One-time copy legacy psychologist_profiles → master_profiles.
  try {
    const legacy = await db.execute(`SELECT * FROM psychologist_profiles`);
    for (const row of legacy.rows) {
      const userId = Number(row.user_id);
      const complete = Boolean(row.onboarding_complete);
      await db.execute({
        sql: `INSERT OR IGNORE INTO master_profiles (
          user_id, slug, name, specialty, city, duration, price, schedule,
          timezone, cancel_hours, status, onboarding_step, onboarding_completed_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId,
          `m${userId}`,
          String(row.name ?? ""),
          row.specialty != null ? String(row.specialty) : null,
          String(row.city ?? "Москва"),
          Number(row.duration ?? 60),
          Number(row.price ?? 0),
          String(row.schedule ?? "weekday"),
          String(row.timezone ?? "Europe/Moscow"),
          Number(row.cancel_hours ?? 24),
          complete ? "active" : "draft",
          complete ? 4 : 1,
          complete ? String(row.updated_at) : null,
          String(row.created_at),
          String(row.updated_at),
        ],
      });
    }
  } catch (err) {
    console.warn("[migrate] legacy profile copy skipped", err);
  }

  migrated = true;
}

export async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  await migrate();
  return fn(getDb());
}
