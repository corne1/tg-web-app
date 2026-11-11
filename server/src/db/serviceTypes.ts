import { withDb } from "./client.js";
import type { ServiceTypeRow } from "./types.js";

/** Seed catalog — kinds of services (specialties) for master onboarding. */
export const SERVICE_TYPE_SEED: ReadonlyArray<{
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

function mapServiceType(row: Record<string, unknown>): ServiceTypeRow {
  return {
    code: String(row.code),
    label: String(row.label),
    title: String(row.title),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function seedServiceTypes(): Promise<void> {
  await withDb(async (db) => {
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
        args: [
          item.code,
          item.label,
          item.title,
          item.sortOrder,
          now,
          now,
        ],
      });
    }
  });
}

export async function listServiceTypes(
  activeOnly = true,
): Promise<ServiceTypeRow[]> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: activeOnly
        ? `SELECT * FROM service_types
           WHERE is_active = 1
           ORDER BY sort_order ASC, label ASC`
        : `SELECT * FROM service_types
           ORDER BY sort_order ASC, label ASC`,
      args: [],
    });
    return result.rows.map((r) =>
      mapServiceType(r as unknown as Record<string, unknown>),
    );
  });
}

export async function getServiceType(
  code: string,
): Promise<ServiceTypeRow | null> {
  const c = code.trim();
  if (!c) return null;
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT * FROM service_types WHERE code = ?`,
      args: [c],
    });
    const row = result.rows[0];
    return row
      ? mapServiceType(row as unknown as Record<string, unknown>)
      : null;
  });
}

export async function isValidServiceTypeCode(code: string): Promise<boolean> {
  const row = await getServiceType(code);
  return Boolean(row?.is_active);
}
