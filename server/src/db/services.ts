import { withDb } from "./client.js";
import type { MasterServiceRow } from "./types.js";

function mapService(row: Record<string, unknown>): MasterServiceRow {
  return {
    id: String(row.id),
    master_id: Number(row.master_id),
    title: String(row.title),
    duration_min: Number(row.duration_min),
    price: Number(row.price),
    price_mode: row.price_mode === "from" ? "from" : "fixed",
    break_after_min: Number(row.break_after_min),
    description: String(row.description ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export type UpsertServiceInput = {
  id: string;
  masterId: number;
  title: string;
  durationMin: number;
  price: number;
  priceMode: "fixed" | "from";
  breakAfterMin: number;
  description: string;
  sortOrder?: number;
};

export async function listServices(
  masterId: number,
): Promise<MasterServiceRow[]> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT * FROM master_services
        WHERE master_id = ?
        ORDER BY sort_order ASC, created_at ASC`,
      args: [masterId],
    });
    return result.rows.map((r) =>
      mapService(r as unknown as Record<string, unknown>),
    );
  });
}

export async function getService(
  id: string,
  masterId: number,
): Promise<MasterServiceRow | null> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT * FROM master_services WHERE id = ? AND master_id = ?`,
      args: [id, masterId],
    });
    const row = result.rows[0];
    return row ? mapService(row as unknown as Record<string, unknown>) : null;
  });
}

export async function upsertService(
  input: UpsertServiceInput,
): Promise<MasterServiceRow> {
  return withDb(async (db) => {
    const now = new Date().toISOString();
    const existing = await db.execute({
      sql: `SELECT * FROM master_services WHERE id = ? AND master_id = ?`,
      args: [input.id, input.masterId],
    });
    const prev = existing.rows[0];
    const createdAt = prev ? String(prev.created_at) : now;
    const sortOrder =
      input.sortOrder ??
      (prev ? Number(prev.sort_order) : Date.now() % 1_000_000_000);

    await db.execute({
      sql: `INSERT INTO master_services (
        id, master_id, title, duration_min, price, price_mode,
        break_after_min, description, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        duration_min = excluded.duration_min,
        price = excluded.price,
        price_mode = excluded.price_mode,
        break_after_min = excluded.break_after_min,
        description = excluded.description,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at`,
      args: [
        input.id,
        input.masterId,
        input.title.trim(),
        input.durationMin,
        input.price,
        input.priceMode,
        input.breakAfterMin,
        input.description.trim(),
        sortOrder,
        createdAt,
        now,
      ],
    });

    return {
      id: input.id,
      master_id: input.masterId,
      title: input.title.trim(),
      duration_min: input.durationMin,
      price: input.price,
      price_mode: input.priceMode,
      break_after_min: input.breakAfterMin,
      description: input.description.trim(),
      sort_order: sortOrder,
      created_at: createdAt,
      updated_at: now,
    };
  });
}

export async function deleteService(
  id: string,
  masterId: number,
): Promise<boolean> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `DELETE FROM master_services WHERE id = ? AND master_id = ?`,
      args: [id, masterId],
    });
    return Number(result.rowsAffected ?? 0) > 0;
  });
}
