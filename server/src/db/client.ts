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
    ],
    "write",
  );

  migrated = true;
}

export async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  await migrate();
  return fn(getDb());
}
