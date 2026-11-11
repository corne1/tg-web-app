import { randomUUID } from "node:crypto";
import {
  formatDateShort,
  formatTime,
  zonedParts,
} from "../services/time.js";
import { withDb } from "./client.js";

const AVATAR_TONES = ["violet", "sky", "mint", "amber"] as const;
export type AvatarTone = (typeof AVATAR_TONES)[number];

export type MasterClientRow = {
  id: string;
  master_id: number;
  telegram_user_id: number | null;
  name: string;
  phone: string;
  created_at: string;
  updated_at: string;
};

export type ClientNoteRow = {
  id: string;
  master_id: number;
  client_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string | null;
};

export type ClientNextBookingDto = {
  dateLabel: string;
  time: string;
  serviceTitle: string;
  priceLabel: string;
  bookingId: string;
};

export type ClientVisitHistoryItemDto = {
  id: string;
  dateLabel: string;
  serviceTitle: string;
  priceLabel: string;
  statusLabel: string;
  multiService: boolean;
};

export type ClientNoteDto = {
  id: string;
  title: string;
  body: string;
  addedLabel: string;
  editedLabel: string | null;
};

export type MasterClientDto = {
  id: string;
  name: string;
  phone: string;
  visits: number;
  lastVisitLabel: string | null;
  lastVisitAt: string | null;
  avatarTone: AvatarTone;
  notes: ClientNoteDto[];
  clientSinceLabel: string | null;
  nextBooking: ClientNextBookingDto | null;
  history: ClientVisitHistoryItemDto[];
  telegramUserId: number | null;
  telegramUsername: string | null;
};

const MONTH_LONG = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function mapClient(row: Record<string, unknown>): MasterClientRow {
  return {
    id: String(row.id),
    master_id: Number(row.master_id),
    telegram_user_id:
      row.telegram_user_id == null ? null : Number(row.telegram_user_id),
    name: String(row.name),
    phone: String(row.phone ?? ""),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapNote(row: Record<string, unknown>): ClientNoteRow {
  return {
    id: String(row.id),
    master_id: Number(row.master_id),
    client_id: String(row.client_id),
    title: String(row.title),
    body: String(row.body),
    created_at: String(row.created_at),
    updated_at: row.updated_at != null ? String(row.updated_at) : null,
  };
}

export function avatarToneFromId(id: string): AvatarTone {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length]!;
}

function formatRub(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function formatSinceLabel(iso: string, timeZone: string): string {
  const p = zonedParts(new Date(iso), timeZone);
  return `Клиент с ${p.day} ${MONTH_LONG[p.month - 1]} ${p.year}`;
}

function formatNoteAddedLabel(iso: string, timeZone: string): string {
  const p = zonedParts(new Date(iso), timeZone);
  return `Добавлено · ${p.day} ${MONTH_LONG[p.month - 1]} ${p.year}`;
}

function formatNoteEditedLabel(iso: string, timeZone: string): string {
  const p = zonedParts(new Date(iso), timeZone);
  return `Изменено · ${p.day} ${MONTH_LONG[p.month - 1]} ${p.year}`;
}

function formatHistoryDate(iso: string, timeZone: string): string {
  const p = zonedParts(new Date(iso), timeZone);
  return `${p.day} ${MONTH_LONG[p.month - 1]} ${p.year}`;
}

function statusLabel(status: string, paid: boolean): string {
  if (status === "cancelled") return "Отменён";
  if (paid || status === "paid") return "Завершён";
  return "Подтверждён";
}

function tgClientId(telegramUserId: number): string {
  return `tg-${telegramUserId}`;
}

/** Upsert a master client when a Telegram user books. */
export async function ensureClientFromBooking(input: {
  masterId: number;
  telegramUserId: number;
  name: string;
}): Promise<MasterClientRow> {
  return withDb(async (db) => {
    const now = new Date().toISOString();
    const existing = await db.execute({
      sql: `SELECT * FROM master_clients
        WHERE master_id = ? AND telegram_user_id = ?`,
      args: [input.masterId, input.telegramUserId],
    });
    const prev = existing.rows[0];
    if (prev) {
      const row = mapClient(prev as unknown as Record<string, unknown>);
      if (row.name !== input.name && input.name.trim()) {
        await db.execute({
          sql: `UPDATE master_clients SET name = ?, updated_at = ? WHERE id = ?`,
          args: [input.name.trim(), now, row.id],
        });
        return { ...row, name: input.name.trim(), updated_at: now };
      }
      return row;
    }

    const id = tgClientId(input.telegramUserId);
    await db.execute({
      sql: `INSERT INTO master_clients (
        id, master_id, telegram_user_id, name, phone, created_at, updated_at
      ) VALUES (?, ?, ?, ?, '', ?, ?)`,
      args: [
        id,
        input.masterId,
        input.telegramUserId,
        input.name.trim() || "Клиент",
        now,
        now,
      ],
    });
    return {
      id,
      master_id: input.masterId,
      telegram_user_id: input.telegramUserId,
      name: input.name.trim() || "Клиент",
      phone: "",
      created_at: now,
      updated_at: now,
    };
  });
}

/** Pull distinct booking clients into master_clients (idempotent). */
export async function syncClientsFromBookings(
  masterId: number,
): Promise<void> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT client_id, client_name, MIN(created_at) AS first_at
        FROM bookings
        WHERE master_id = ?
        GROUP BY client_id, client_name`,
      args: [masterId],
    });
    const now = new Date().toISOString();
    for (const raw of result.rows) {
      const telegramUserId = Number(raw.client_id);
      const name = String(raw.client_name || "Клиент");
      const firstAt = String(raw.first_at ?? now);
      const existing = await db.execute({
        sql: `SELECT id FROM master_clients
          WHERE master_id = ? AND telegram_user_id = ?`,
        args: [masterId, telegramUserId],
      });
      if (existing.rows[0]) continue;
      await db.execute({
        sql: `INSERT INTO master_clients (
          id, master_id, telegram_user_id, name, phone, created_at, updated_at
        ) VALUES (?, ?, ?, ?, '', ?, ?)`,
        args: [
          tgClientId(telegramUserId),
          masterId,
          telegramUserId,
          name,
          firstAt,
          now,
        ],
      });
    }
  });
}

export async function createMasterClient(input: {
  masterId: number;
  name: string;
  phone?: string;
}): Promise<MasterClientRow> {
  return withDb(async (db) => {
    const now = new Date().toISOString();
    const id = randomUUID();
    const name = input.name.trim();
    const phone = (input.phone ?? "").trim();
    await db.execute({
      sql: `INSERT INTO master_clients (
        id, master_id, telegram_user_id, name, phone, created_at, updated_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?)`,
      args: [id, input.masterId, name, phone, now, now],
    });
    return {
      id,
      master_id: input.masterId,
      telegram_user_id: null,
      name,
      phone,
      created_at: now,
      updated_at: now,
    };
  });
}

export async function getMasterClientRow(
  masterId: number,
  clientId: string,
): Promise<MasterClientRow | null> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT * FROM master_clients WHERE id = ? AND master_id = ?`,
      args: [clientId, masterId],
    });
    const row = result.rows[0];
    return row ? mapClient(row as unknown as Record<string, unknown>) : null;
  });
}

export async function findMasterClientByTelegram(
  masterId: number,
  telegramUserId: number,
): Promise<MasterClientRow | null> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT * FROM master_clients
        WHERE master_id = ? AND telegram_user_id = ?`,
      args: [masterId, telegramUserId],
    });
    const row = result.rows[0];
    return row ? mapClient(row as unknown as Record<string, unknown>) : null;
  });
}

async function listNotesForClient(
  masterId: number,
  clientId: string,
): Promise<ClientNoteRow[]> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT * FROM client_notes
        WHERE master_id = ? AND client_id = ?
        ORDER BY created_at DESC`,
      args: [masterId, clientId],
    });
    return result.rows.map((r) =>
      mapNote(r as unknown as Record<string, unknown>),
    );
  });
}

export async function createClientNote(input: {
  masterId: number;
  clientId: string;
  title: string;
  body: string;
}): Promise<ClientNoteRow> {
  return withDb(async (db) => {
    const now = new Date().toISOString();
    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO client_notes (
        id, master_id, client_id, title, body, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      args: [
        id,
        input.masterId,
        input.clientId,
        input.title.trim() || "Заметка",
        input.body.trim(),
        now,
      ],
    });
    return {
      id,
      master_id: input.masterId,
      client_id: input.clientId,
      title: input.title.trim() || "Заметка",
      body: input.body.trim(),
      created_at: now,
      updated_at: null,
    };
  });
}

export async function updateClientNote(input: {
  masterId: number;
  clientId: string;
  noteId: string;
  title: string;
  body: string;
}): Promise<ClientNoteRow | null> {
  return withDb(async (db) => {
    const existing = await db.execute({
      sql: `SELECT * FROM client_notes
        WHERE id = ? AND master_id = ? AND client_id = ?`,
      args: [input.noteId, input.masterId, input.clientId],
    });
    if (!existing.rows[0]) return null;
    const now = new Date().toISOString();
    const title = input.title.trim() || "Заметка";
    const body = input.body.trim();
    await db.execute({
      sql: `UPDATE client_notes
        SET title = ?, body = ?, updated_at = ?
        WHERE id = ? AND master_id = ? AND client_id = ?`,
      args: [title, body, now, input.noteId, input.masterId, input.clientId],
    });
    const row = existing.rows[0] as unknown as Record<string, unknown>;
    return {
      id: input.noteId,
      master_id: input.masterId,
      client_id: input.clientId,
      title,
      body,
      created_at: String(row.created_at),
      updated_at: now,
    };
  });
}

export async function deleteClientNote(input: {
  masterId: number;
  clientId: string;
  noteId: string;
}): Promise<boolean> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `DELETE FROM client_notes
        WHERE id = ? AND master_id = ? AND client_id = ?`,
      args: [input.noteId, input.masterId, input.clientId],
    });
    return Number(result.rowsAffected ?? 0) > 0;
  });
}

type BookingStatRow = {
  starts_at: string;
  duration_min: number;
  price: number;
  status: string;
  paid: number | boolean;
  client_name: string;
  id: string;
  service_titles: string[];
};

function serviceLineFromTitles(titles: string[]): {
  serviceTitle: string;
  multiService: boolean;
} {
  if (titles.length === 0) {
    return { serviceTitle: "Запись", multiService: false };
  }
  return {
    serviceTitle: titles[0]!,
    multiService: titles.length > 1,
  };
}

function mapBookingStatRow(
  r: Record<string, unknown>,
  titles: string[],
): BookingStatRow {
  return {
    id: String(r.id),
    starts_at: String(r.starts_at),
    duration_min: Number(r.duration_min),
    price: Number(r.price),
    status: String(r.status),
    paid: r.paid as number | boolean,
    client_name: String(r.client_name),
    service_titles: titles,
  };
}

async function listBookingsForClient(
  masterId: number,
  masterClientId: string,
  telegramUserId: number | null,
): Promise<BookingStatRow[]> {
  return withDb(async (db) => {
    const result =
      telegramUserId != null
        ? await db.execute({
            sql: `SELECT id, starts_at, duration_min, price, status, paid, client_name
              FROM bookings
              WHERE master_id = ?
                AND (client_id = ? OR master_client_id = ?)
              ORDER BY starts_at DESC`,
            args: [masterId, telegramUserId, masterClientId],
          })
        : await db.execute({
            sql: `SELECT id, starts_at, duration_min, price, status, paid, client_name
              FROM bookings
              WHERE master_id = ? AND master_client_id = ?
              ORDER BY starts_at DESC`,
            args: [masterId, masterClientId],
          });

    const ids = result.rows.map((r) => String(r.id));
    const titlesByBooking = new Map<string, string[]>();
    if (ids.length > 0) {
      const placeholders = ids.map(() => "?").join(", ");
      const svc = await db.execute({
        sql: `SELECT booking_id, title FROM booking_services
          WHERE booking_id IN (${placeholders})
          ORDER BY sort_order ASC`,
        args: ids,
      });
      for (const row of svc.rows) {
        const bid = String(row.booking_id);
        const list = titlesByBooking.get(bid) ?? [];
        list.push(String(row.title));
        titlesByBooking.set(bid, list);
      }
    }

    return result.rows.map((r) =>
      mapBookingStatRow(
        r as unknown as Record<string, unknown>,
        titlesByBooking.get(String(r.id)) ?? [],
      ),
    );
  });
}

function buildClientDto(
  row: MasterClientRow,
  bookings: BookingStatRow[],
  notes: ClientNoteRow[],
  timeZone: string,
  telegramUsername: string | null = null,
): MasterClientDto {
  const now = Date.now();
  const active = bookings.filter((b) => b.status !== "cancelled");
  const past = active.filter((b) => Date.parse(b.starts_at) < now);
  const future = active
    .filter((b) => Date.parse(b.starts_at) >= now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));

  const last = past[0] ?? null;
  const next = future[0] ?? null;
  const visits = past.length;

  const noteDtos: ClientNoteDto[] = notes.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    addedLabel: formatNoteAddedLabel(n.created_at, timeZone),
    editedLabel:
      n.updated_at && n.updated_at !== n.created_at
        ? formatNoteEditedLabel(n.updated_at, timeZone)
        : null,
  }));

  const history: ClientVisitHistoryItemDto[] = past.map((b) => {
    const line = serviceLineFromTitles(b.service_titles);
    return {
      id: b.id,
      dateLabel: formatHistoryDate(b.starts_at, timeZone),
      serviceTitle: line.serviceTitle,
      priceLabel: formatRub(b.price),
      statusLabel: statusLabel(b.status, Boolean(b.paid)),
      multiService: line.multiService,
    };
  });

  let nextBooking: ClientNextBookingDto | null = null;
  if (next) {
    const p = zonedParts(new Date(next.starts_at), timeZone);
    const line = serviceLineFromTitles(next.service_titles);
    nextBooking = {
      dateLabel: `${p.day} ${MONTH_LONG[p.month - 1]}`,
      time: formatTime(next.starts_at, timeZone),
      serviceTitle: line.serviceTitle,
      priceLabel: formatRub(next.price),
      bookingId: next.id,
    };
  }

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    visits,
    lastVisitLabel: last
      ? formatDateShort(last.starts_at, timeZone)
      : null,
    lastVisitAt: last ? last.starts_at.slice(0, 10) : null,
    avatarTone: avatarToneFromId(row.id),
    notes: noteDtos,
    clientSinceLabel:
      visits > 0 || row.telegram_user_id != null
        ? formatSinceLabel(row.created_at, timeZone)
        : "Новый клиент",
    nextBooking,
    history,
    telegramUserId: row.telegram_user_id,
    telegramUsername,
  };
}

async function lookupTelegramUsername(
  telegramUserId: number | null,
): Promise<string | null> {
  if (telegramUserId == null) return null;
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT username FROM users WHERE id = ?`,
      args: [telegramUserId],
    });
    const raw = result.rows[0]?.username;
    if (raw == null) return null;
    const username = String(raw).trim().replace(/^@/, "");
    return username || null;
  });
}

export async function listMasterClients(
  masterId: number,
  timeZone: string,
): Promise<MasterClientDto[]> {
  await syncClientsFromBookings(masterId);
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT * FROM master_clients
        WHERE master_id = ?
        ORDER BY updated_at DESC`,
      args: [masterId],
    });
    const rows = result.rows.map((r) =>
      mapClient(r as unknown as Record<string, unknown>),
    );

    const out: MasterClientDto[] = [];
    for (const row of rows) {
      const bookings = await listBookingsForClient(
        masterId,
        row.id,
        row.telegram_user_id,
      );
      const notes = await listNotesForClient(masterId, row.id);
      const telegramUsername = await lookupTelegramUsername(
        row.telegram_user_id,
      );
      out.push(
        buildClientDto(row, bookings, notes, timeZone, telegramUsername),
      );
    }
    return out;
  });
}

export async function getMasterClientDto(
  masterId: number,
  clientId: string,
  timeZone: string,
): Promise<MasterClientDto | null> {
  await syncClientsFromBookings(masterId);
  const row = await getMasterClientRow(masterId, clientId);
  if (!row) return null;
  const bookings = await listBookingsForClient(
    masterId,
    row.id,
    row.telegram_user_id,
  );
  const notes = await listNotesForClient(masterId, row.id);
  const telegramUsername = await lookupTelegramUsername(row.telegram_user_id);
  return buildClientDto(row, bookings, notes, timeZone, telegramUsername);
}
