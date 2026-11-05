import { Router } from "express";
import { bookingDeepLink, masterDeepLink } from "../config.js";
import { listMasterBookings } from "../db/bookings.js";
import {
  createClientNote,
  createMasterClient,
  ensureClientFromBooking,
  findMasterClientByTelegram,
  getMasterClientDto,
  listMasterClients,
} from "../db/clients.js";
import { ensureMasterProfile } from "../db/profiles.js";
import { upsertUser } from "../db/users.js";
import { requireSession, type AuthedRequest } from "../middleware.js";
import {
  addLocalDays,
  formatDateLabel,
  formatTime,
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
