import { Router } from "express";
import { bookingDeepLink, masterDeepLink } from "../config.js";
import {
  BookingConflictError,
  createBooking,
  listMasterBookings,
} from "../db/bookings.js";
import {
  createClientNote,
  createMasterClient,
  deleteClientNote,
  ensureClientFromBooking,
  findMasterClientByTelegram,
  getMasterClientDto,
  getMasterClientRow,
  listMasterClients,
  updateClientNote,
} from "../db/clients.js";
import { ensureMasterProfile } from "../db/profiles.js";
import { getService } from "../db/services.js";
import { upsertUser } from "../db/users.js";
import { requireSession, type AuthedRequest } from "../middleware.js";
import {
  addLocalDays,
  formatDateLabel,
  formatTime,
  localToUtcIso,
  startOfLocalDay,
} from "../services/time.js";
import { serializeProfile } from "./serializers.js";

export const cabinetRouter = Router();

cabinetRouter.get(
  "/sessions",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    await upsertUser(tg);
    const profile = await ensureMasterProfile(
      tg.id,
      [tg.first_name, tg.last_name].filter(Boolean).join(" "),
    );

    const onboardingComplete =
      profile.status === "active" && Boolean(profile.onboarding_completed_at);

    if (!onboardingComplete) {
      res.json({
        sessions: [],
        bookingLink: bookingDeepLink(profile.slug) ?? masterDeepLink(tg.id),
        onboardingComplete: false,
        onboardingStep: profile.onboarding_step,
        profile: serializeProfile(profile),
      });
      return;
    }

    const period = String(req.query.period ?? "today");
    const tz = profile.timezone;
    const today = startOfLocalDay(new Date(), tz);
    let from = today;
    let to = addLocalDays(today, 1, tz);
    if (period === "tomorrow") {
      from = addLocalDays(today, 1, tz);
      to = addLocalDays(today, 2, tz);
    } else if (period === "week") {
      from = today;
      to = addLocalDays(today, 7, tz);
    }

    const rows = await listMasterBookings(
      tg.id,
      from.toISOString(),
      to.toISOString(),
    );

    const sessions = await Promise.all(
      rows.map(async (b) => {
        let clientId: string | null = null;
        const existing = await findMasterClientByTelegram(tg.id, b.client_id);
        if (existing) {
          clientId = existing.id;
        } else {
          const ensured = await ensureClientFromBooking({
            masterId: tg.id,
            telegramUserId: b.client_id,
            name: b.client_name,
          });
          clientId = ensured.id;
        }
        return {
          id: b.id,
          startsAt: b.starts_at,
          time: formatTime(b.starts_at, tz),
          dateLabel: formatDateLabel(b.starts_at, tz),
          clientName: b.client_name,
          clientId,
          status: b.status,
          paid: b.paid,
          durationMin: b.duration_min,
          price: b.price,
          createdAt: b.created_at,
        };
      }),
    );

    res.json({
      sessions,
      bookingLink: bookingDeepLink(profile.slug) ?? masterDeepLink(tg.id),
      onboardingComplete: true,
      onboardingStep: profile.onboarding_step,
      profile: serializeProfile(profile),
    });
  },
);

cabinetRouter.get(
  "/clients",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    await upsertUser(tg);
    const profile = await ensureMasterProfile(
      tg.id,
      [tg.first_name, tg.last_name].filter(Boolean).join(" "),
    );
    const clients = await listMasterClients(tg.id, profile.timezone);
    res.json({ clients });
  },
);

cabinetRouter.get(
  "/clients/:clientId",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    await upsertUser(tg);
    const profile = await ensureMasterProfile(
      tg.id,
      [tg.first_name, tg.last_name].filter(Boolean).join(" "),
    );
    const clientId = String(req.params.clientId ?? "");
    const client = await getMasterClientDto(tg.id, clientId, profile.timezone);
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json({ client });
  },
);

cabinetRouter.post(
  "/clients",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    await upsertUser(tg);
    await ensureMasterProfile(
      tg.id,
      [tg.first_name, tg.last_name].filter(Boolean).join(" "),
    );
    const body = req.body ?? {};
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "name required" });
      return;
    }
    const profile = await ensureMasterProfile(
      tg.id,
      [tg.first_name, tg.last_name].filter(Boolean).join(" "),
    );
    const row = await createMasterClient({
      masterId: tg.id,
      name,
      phone,
    });
    const client = await getMasterClientDto(tg.id, row.id, profile.timezone);
    res.status(201).json({ client });
  },
);

cabinetRouter.post(
  "/clients/:clientId/notes",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    await upsertUser(tg);
    const profile = await ensureMasterProfile(
      tg.id,
      [tg.first_name, tg.last_name].filter(Boolean).join(" "),
    );
    const clientId = String(req.params.clientId ?? "");
    const existing = await getMasterClientDto(
      tg.id,
      clientId,
      profile.timezone,
    );
    if (!existing) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    const body = req.body ?? {};
    const title = String(body.title ?? "").trim();
    const noteBody = String(body.body ?? "").trim();
    if (!noteBody) {
      res.status(400).json({ error: "body required" });
      return;
    }
    await createClientNote({
      masterId: tg.id,
      clientId,
      title: title || "Заметка",
      body: noteBody,
    });
    const client = await getMasterClientDto(tg.id, clientId, profile.timezone);
    res.status(201).json({ client });
  },
);

cabinetRouter.patch(
  "/clients/:clientId/notes/:noteId",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    await upsertUser(tg);
    const profile = await ensureMasterProfile(
      tg.id,
      [tg.first_name, tg.last_name].filter(Boolean).join(" "),
    );
    const clientId = String(req.params.clientId ?? "");
    const noteId = String(req.params.noteId ?? "");
    const body = req.body ?? {};
    const title = String(body.title ?? "").trim();
    const noteBody = String(body.body ?? "").trim();
    if (!noteBody) {
      res.status(400).json({ error: "body required" });
      return;
    }
    const updated = await updateClientNote({
      masterId: tg.id,
      clientId,
      noteId,
      title: title || "Заметка",
      body: noteBody,
    });
    if (!updated) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    const client = await getMasterClientDto(tg.id, clientId, profile.timezone);
    res.json({ client });
  },
);

cabinetRouter.delete(
  "/clients/:clientId/notes/:noteId",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    await upsertUser(tg);
    const profile = await ensureMasterProfile(
      tg.id,
      [tg.first_name, tg.last_name].filter(Boolean).join(" "),
    );
    const clientId = String(req.params.clientId ?? "");
    const noteId = String(req.params.noteId ?? "");
    const ok = await deleteClientNote({
      masterId: tg.id,
      clientId,
      noteId,
    });
    if (!ok) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    const client = await getMasterClientDto(tg.id, clientId, profile.timezone);
    res.json({ client });
  },
);

/** Create booking from cabinet «Новая запись» (Blur #39 multi-service titles). */
cabinetRouter.post(
  "/bookings",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    await upsertUser(tg);
    const profile = await ensureMasterProfile(
      tg.id,
      [tg.first_name, tg.last_name].filter(Boolean).join(" "),
    );
    const body = req.body ?? {};
    const masterClientId = String(body.masterClientId ?? body.clientId ?? "");
    const dateISO = String(body.dateISO ?? "").trim();
    const time = String(body.time ?? "").trim();
    const serviceIds = Array.isArray(body.serviceIds)
      ? body.serviceIds.map((id: unknown) => String(id))
      : [];

    if (!masterClientId || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      res.status(400).json({ error: "masterClientId and dateISO required" });
      return;
    }
    const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time);
    if (!timeMatch) {
      res.status(400).json({ error: "time required (HH:MM)" });
      return;
    }

    const clientRow = await getMasterClientRow(tg.id, masterClientId);
    if (!clientRow) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    if (
      !Number.isFinite(hour) ||
      !Number.isFinite(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      res.status(400).json({ error: "Invalid time" });
      return;
    }

    const [y, m, d] = dateISO.split("-").map(Number);
    const startsAt = localToUtcIso(
      y!,
      m!,
      d!,
      hour,
      minute,
      profile.timezone,
    );

    const titles: string[] = [];
    let durationMin = 0;
    let price = 0;
    for (const sid of serviceIds) {
      const svc = await getService(sid, tg.id);
      if (!svc) continue;
      titles.push(svc.title);
      durationMin += svc.duration_min + (svc.break_after_min || 0);
      price += svc.price;
    }
    if (titles.length === 0) {
      res.status(400).json({ error: "At least one valid service required" });
      return;
    }

    const bookingClientId = clientRow.telegram_user_id ?? tg.id;

    try {
      const booking = await createBooking({
        masterId: tg.id,
        clientId: bookingClientId,
        clientName: clientRow.name,
        startsAt,
        durationMin,
        price,
        serviceTitles: titles,
        masterClientId: clientRow.id,
      });
      res.status(201).json({
        booking: {
          id: booking.id,
          startsAt: booking.starts_at,
          time: formatTime(booking.starts_at, profile.timezone),
          date: formatDateLabel(booking.starts_at, profile.timezone),
          clientName: booking.client_name,
          duration: booking.duration_min,
          price: booking.price,
          status: booking.status,
          serviceTitles: titles,
        },
      });
    } catch (err) {
      if (err instanceof BookingConflictError) {
        res.status(409).json({ error: err.message });
        return;
      }
      console.error("[cabinet.bookings.create]", err);
      res.status(500).json({ error: "Failed to create booking" });
    }
  },
);
