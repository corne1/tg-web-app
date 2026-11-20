import type { BookingRow } from "./types.js";
import { hydrateBookings } from "./bookingRows.js";
import { withDb } from "./client.js";

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
      const row = result.rows[i]!;
      return {
        ...base,
        master_name: String(row.master_name),
        master_timezone: String(row.master_timezone),
        client_telegram_id: base.client_id,
        master_telegram_id: base.master_id,
      };
    });
  });
}

export async function markReminded(id: string, kind: "24h" | "1h"): Promise<void> {
  const col = kind === "24h" ? "reminded_24h" : "reminded_1h";
  await withDb(async (db) => {
    await db.execute({
      sql: `UPDATE bookings SET ${col} = 1, updated_at = ? WHERE id = ?`,
      args: [new Date().toISOString(), id],
    });
  });
}
