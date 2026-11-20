import { randomUUID } from "node:crypto";
import { withDb } from "./client.js";

export type ClientNoteRow = {
  id: string;
  master_id: number;
  client_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string | null;
};

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

export async function listNotesForClient(
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
    return result.rows.map((row) =>
      mapNote(row as unknown as Record<string, unknown>),
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
