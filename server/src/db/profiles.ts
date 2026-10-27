import { withDb } from "./client.js";
import type { PsychologistProfileRow, ScheduleKind } from "./types.js";

function mapProfile(row: Record<string, unknown>): PsychologistProfileRow {
  return {
    user_id: Number(row.user_id),
    name: String(row.name),
    duration: Number(row.duration) as 50 | 60,
    price: Number(row.price),
    schedule: String(row.schedule) as ScheduleKind,
    timezone: String(row.timezone),
    cancel_hours: Number(row.cancel_hours),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export type UpsertProfileInput = {
  userId: number;
  name: string;
  duration: 50 | 60;
  price: number;
  schedule: ScheduleKind;
  timezone?: string;
  cancelHours?: number;
};

export async function upsertProfile(
  input: UpsertProfileInput,
): Promise<PsychologistProfileRow> {
  return withDb(async (db) => {
    const now = new Date().toISOString();
    const existing = await db.execute({
      sql: "SELECT * FROM psychologist_profiles WHERE user_id = ?",
      args: [input.userId],
    });
    const prev = existing.rows[0];
    const createdAt = prev ? String(prev.created_at) : now;
    const timezone =
      input.timezone ??
      (prev ? String(prev.timezone) : "Europe/Moscow");
    const cancelHours =
      input.cancelHours ??
      (prev ? Number(prev.cancel_hours) : 24);

    await db.execute({
      sql: `INSERT INTO psychologist_profiles (
        user_id, name, duration, price, schedule, timezone, cancel_hours,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        name = excluded.name,
        duration = excluded.duration,
        price = excluded.price,
        schedule = excluded.schedule,
        timezone = excluded.timezone,
        cancel_hours = excluded.cancel_hours,
        updated_at = excluded.updated_at`,
      args: [
        input.userId,
        input.name.trim(),
        input.duration,
        input.price,
        input.schedule,
        timezone,
        cancelHours,
        createdAt,
        now,
      ],
    });

    return {
      user_id: input.userId,
      name: input.name.trim(),
      duration: input.duration,
      price: input.price,
      schedule: input.schedule,
      timezone,
      cancel_hours: cancelHours,
      created_at: createdAt,
      updated_at: now,
    };
  });
}

export async function getProfile(
  userId: number,
): Promise<PsychologistProfileRow | null> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: "SELECT * FROM psychologist_profiles WHERE user_id = ?",
      args: [userId],
    });
    const row = result.rows[0];
    return row ? mapProfile(row as unknown as Record<string, unknown>) : null;
  });
}
