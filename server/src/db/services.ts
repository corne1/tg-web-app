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
    service_type_code:
      row.service_type_code != null ? String(row.service_type_code) : null,
    is_active: row.is_active == null ? true : Boolean(row.is_active),
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
  serviceTypeCode?: string | null;
  isActive?: boolean;
};

export async function listServices(
  masterId: number,
  activeOnly = true,
): Promise<MasterServiceRow[]> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: activeOnly
        ? `SELECT * FROM master_services
           WHERE master_id = ? AND is_active = 1
           ORDER BY sort_order ASC, created_at ASC`
        : `SELECT * FROM master_services
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
  activeOnly = true,
): Promise<MasterServiceRow | null> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: activeOnly
        ? `SELECT * FROM master_services
           WHERE id = ? AND master_id = ? AND is_active = 1`
        : `SELECT * FROM master_services
           WHERE id = ? AND master_id = ?`,
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

    let serviceTypeCode =
      input.serviceTypeCode !== undefined
        ? input.serviceTypeCode
        : prev?.service_type_code != null
          ? String(prev.service_type_code)
          : null;
    if (!serviceTypeCode) {
      const profile = await db.execute({
        sql: `SELECT service_type_code FROM master_profiles WHERE user_id = ?`,
        args: [input.masterId],
      });
      const raw = profile.rows[0]?.service_type_code;
      serviceTypeCode = raw != null ? String(raw) : null;
    }
    if (serviceTypeCode) {
      const st = await db.execute({
        sql: `SELECT code FROM service_types
          WHERE code = ? AND is_active = 1`,
        args: [serviceTypeCode],
      });
      if (!st.rows[0]) {
        throw new Error(`Unknown service type: ${serviceTypeCode}`);
      }
    }

    const isActive =
      input.isActive ??
      (prev?.is_active == null ? true : Boolean(prev.is_active));

    await db.execute({
      sql: `INSERT INTO master_services (
        id, master_id, service_type_code, title, duration_min, price, price_mode,
        break_after_min, description, sort_order, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        service_type_code = excluded.service_type_code,
        title = excluded.title,
        duration_min = excluded.duration_min,
        price = excluded.price,
        price_mode = excluded.price_mode,
        break_after_min = excluded.break_after_min,
        description = excluded.description,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at`,
      args: [
        input.id,
        input.masterId,
        serviceTypeCode,
        input.title.trim(),
        input.durationMin,
        input.price,
        input.priceMode,
        input.breakAfterMin,
        input.description.trim(),
        sortOrder,
        isActive ? 1 : 0,
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
      service_type_code: serviceTypeCode,
      is_active: isActive,
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
    // Soft-delete to keep booking_services.service_id history intact.
    const result = await db.execute({
      sql: `UPDATE master_services
        SET is_active = 0, updated_at = ?
        WHERE id = ? AND master_id = ? AND is_active = 1`,
      args: [new Date().toISOString(), id, masterId],
    });
    return Number(result.rowsAffected ?? 0) > 0;
  });
}
