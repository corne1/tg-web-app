import type { TelegramUser } from "../telegramAuth.js";
import { withDb } from "./client.js";
import type { StoredUser } from "./types.js";

function mapUser(row: Record<string, unknown>): StoredUser {
  return {
    id: Number(row.id),
    first_name: String(row.first_name),
    last_name: (row.last_name as string | null) ?? null,
    username: (row.username as string | null) ?? null,
    language_code: (row.language_code as string | null) ?? null,
    is_premium: Boolean(row.is_premium),
    photo_url: (row.photo_url as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    last_seen_at: String(row.last_seen_at),
  };
}

export async function upsertUser(user: TelegramUser): Promise<StoredUser> {
  return withDb(async (db) => {
    const now = new Date().toISOString();
    const existing = await db.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [user.id],
    });
    const prev = existing.rows[0];
    const createdAt = prev ? String(prev.created_at) : now;

    await db.execute({
      sql: `INSERT INTO users (
        id, first_name, last_name, username, language_code, is_premium, photo_url,
        created_at, updated_at, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        username = excluded.username,
        language_code = excluded.language_code,
        is_premium = excluded.is_premium,
        photo_url = excluded.photo_url,
        updated_at = excluded.updated_at,
        last_seen_at = excluded.last_seen_at`,
      args: [
        user.id,
        user.first_name,
        user.last_name ?? null,
        user.username ?? null,
        user.language_code ?? null,
        user.is_premium ? 1 : 0,
        user.photo_url ?? null,
        createdAt,
        now,
        now,
      ],
    });

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name ?? null,
      username: user.username ?? null,
      language_code: user.language_code ?? null,
      is_premium: Boolean(user.is_premium),
      photo_url: user.photo_url ?? null,
      created_at: createdAt,
      updated_at: now,
      last_seen_at: now,
    };
  });
}

export async function getUser(id: number): Promise<StoredUser | null> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [id],
    });
    const row = result.rows[0];
    return row ? mapUser(row as unknown as Record<string, unknown>) : null;
  });
}
