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
};

export type ClientNoteDto = {
  id: string;
  title: string;
  body: string;
  addedLabel: string;
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
        id, master_id, client_id, title, body, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
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
    };
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
};

async function listBookingsForTelegramClient(
  masterId: number,
  telegramUserId: number,
): Promise<BookingStatRow[]> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: `SELECT id, starts_at, duration_min, price, status, paid, client_name
        FROM bookings
        WHERE master_id = ? AND client_id = ?
        ORDER BY starts_at DESC`,
      args: [masterId, telegramUserId],
    });
    return result.rows.map((r) => ({
      id: String(r.id),
      starts_at: String(r.starts_at),
      duration_min: Number(r.duration_min),
      price: Number(r.price),
      status: String(r.status),
      paid: r.paid as number | boolean,
      client_name: String(r.client_name),
    }));
  });
}

function buildClientDto(
  row: MasterClientRow,
  bookings: BookingStatRow[],
  notes: ClientNoteRow[],
  timeZone: string,
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
  }));

  const history: ClientVisitHistoryItemDto[] = past.map((b) => ({
    id: b.id,
    dateLabel: formatHistoryDate(b.starts_at, timeZone),
    serviceTitle: "Запись",
    priceLabel: formatRub(b.price),
    statusLabel: statusLabel(b.status, Boolean(b.paid)),
  }));

  let nextBooking: ClientNextBookingDto | null = null;
  if (next) {
    const p = zonedParts(new Date(next.starts_at), timeZone);
    nextBooking = {
      dateLabel: `${p.day} ${MONTH_LONG[p.month - 1]}`,
      time: formatTime(next.starts_at, timeZone),
      serviceTitle: "Запись",
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
  };
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
      const bookings =
        row.telegram_user_id != null
          ? await listBookingsForTelegramClient(masterId, row.telegram_user_id)
          : [];
      const notes = await listNotesForClient(masterId, row.id);
      out.push(buildClientDto(row, bookings, notes, timeZone));
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
  const bookings =
    row.telegram_user_id != null
      ? await listBookingsForTelegramClient(masterId, row.telegram_user_id)
      : [];
  const notes = await listNotesForClient(masterId, row.id);
  return buildClientDto(row, bookings, notes, timeZone);
}
