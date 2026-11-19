import { withDb } from "./client.js";

/** Drop a test master's profile, services, clients, and bookings so onboarding starts over. */
export async function resetDevMaster(userId: number): Promise<void> {
  await withDb(async (db) => {
    await db.execute({
      sql: `DELETE FROM booking_services WHERE booking_id IN (
        SELECT id FROM bookings WHERE master_id = ?
      )`,
      args: [userId],
    });
    await db.execute({
      sql: "DELETE FROM bookings WHERE master_id = ?",
      args: [userId],
    });
    await db.execute({
      sql: "DELETE FROM master_profiles WHERE user_id = ?",
      args: [userId],
    });
  });
}
