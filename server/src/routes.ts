import { Router } from "express";
import {
  BookingConflictError,
  BookingRuleError,
  cancelBooking,
  createBooking,
  getBooking,
  listClientBookings,
  listDueReminders,
  listPsychologistBookings,
  markPaid,
  markReminded,
  rescheduleBooking,
} from "./db/bookings.js";
import {
  ensureMasterProfile,
  getProfile,
  getProfileBySlug,
  markOnboardingComplete,
  setOnboardingStep,
  upsertProfile,
} from "./db/profiles.js";
import {
  deleteService,
  listServices,
  upsertService,
} from "./db/services.js";
import { getUser, upsertUser } from "./db/users.js";
import {
  bookingDeepLink,
  config,
  psychologistDeepLink,
} from "./config.js";
import { requireSession, type AuthedRequest } from "./middleware.js";
import { createSessionToken } from "./session.js";
import { generateSlots } from "./services/slots.js";
import {
  notifyBookingCancelled,
  notifyBookingCreated,
  notifyReminder,
} from "./services/notify.js";
import { AuthError, validateInitData } from "./telegramAuth.js";
import {
  addLocalDays,
  formatDateLabel,
  formatTime,
  startOfLocalDay,
} from "./services/time.js";
import type { MasterProfileRow, ScheduleKind } from "./db/types.js";

export const apiRouter = Router();

function serializeProfile(profile: MasterProfileRow) {
  const onboardingComplete =
    profile.status === "active" && Boolean(profile.onboarding_completed_at);
  return {
    userId: profile.user_id,
    slug: profile.slug,
    name: profile.name,
    duration: profile.duration,
    price: profile.price,
    schedule: profile.schedule,
    timezone: profile.timezone,
    cancelHours: profile.cancel_hours,
    specialty: profile.specialty,
    city: profile.city,
    status: profile.status,
    onboardingStep: profile.onboarding_step,
    onboardingComplete,
    onboardingCompletedAt: profile.onboarding_completed_at,
    bookingLink:
      bookingDeepLink(profile.slug) ?? psychologistDeepLink(profile.user_id),
  };
}

function serializeService(row: Awaited<ReturnType<typeof listServices>>[number]) {
  return {
    id: row.id,
    title: row.title,
    durationMin: row.duration_min,
    price: row.price,
    priceMode: row.price_mode,
    breakAfterMin: row.break_after_min,
    description: row.description,
  };
}

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * Exchange Telegram initData for a session JWT and upsert user.
 * Body: { initData: string }
 */
apiRouter.post("/auth/telegram", async (req, res) => {
  const initData = req.body?.initData;
  if (typeof initData !== "string" || !initData) {
    res.status(400).json({ error: "initData required" });
    return;
  }

  try {
    const validated = validateInitData(initData, config.botToken);
    const user = await upsertUser(validated.user);
    const token = await createSessionToken(validated.user);

    const maxAge = 7 * 24 * 60 * 60;
    res.setHeader(
      "Set-Cookie",
      `session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${maxAge}`,
    );
    res.json({ token, user });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message });
      return;
    }
    console.error("[auth]", err);
    res.status(500).json({ error: "Auth failed" });
  }
});

apiRouter.get("/me", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const stored = await getUser(tg.id);
  const profile = await getProfile(tg.id);
  const services = profile ? await listServices(tg.id) : [];
  res.json({
    user: stored ?? tg,
    profile: profile ? serializeProfile(profile) : null,
    services: services.map(serializeService),
  });
});

apiRouter.get("/config/public", (_req, res) => {
  res.json({
    botUsername: config.botUsername || null,
  });
});

apiRouter.put("/profile", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const body = req.body ?? {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const duration = Number(body.duration);
  const price = Number(body.price);
  const schedule = body.schedule as ScheduleKind;
  const cancelHours =
    body.cancelHours !== undefined ? Number(body.cancelHours) : undefined;

  if (!name || name.length > 80) {
    res.status(400).json({ error: "Invalid name" });
    return;
  }
  if (duration !== 50 && duration !== 60) {
    res.status(400).json({ error: "duration must be 50 or 60" });
    return;
  }
  if (!Number.isFinite(price) || price <= 0) {
    res.status(400).json({ error: "Invalid price" });
    return;
  }
  if (!["weekday", "weekend", "manual"].includes(schedule)) {
    res.status(400).json({ error: "Invalid schedule" });
    return;
  }
  if (
    cancelHours !== undefined &&
    (!Number.isFinite(cancelHours) || cancelHours < 0 || cancelHours > 168)
  ) {
    res.status(400).json({ error: "Invalid cancelHours" });
    return;
  }

  try {
    await upsertUser(tg);
    const profile = await upsertProfile({
      userId: tg.id,
      name,
      duration,
      price,
      schedule,
      cancelHours,
    });
    res.json({ profile: serializeProfile(profile) });
  } catch (err) {
    console.error("[profile]", err);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

/**
 * Enter master context: get-or-create draft profile for this Telegram user.
 * Never recreates an active completed profile.
 */
apiRouter.post("/master/ensure", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  try {
    await upsertUser(tg);
    const profile = await ensureMasterProfile(
      tg.id,
      [tg.first_name, tg.last_name].filter(Boolean).join(" "),
    );
    const services = await listServices(tg.id);
    res.json({
      profile: serializeProfile(profile),
      services: services.map(serializeService),
    });
  } catch (err) {
    console.error("[master.ensure]", err);
    res.status(500).json({ error: "Failed to ensure master profile" });
  }
});

/** Master onboarding step 1 — identity by Telegram user id. */
apiRouter.put("/master/profile", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const body = req.body ?? {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const specialty =
    typeof body.specialty === "string" ? body.specialty.trim() : "";
  const city =
    typeof body.city === "string" && body.city.trim()
      ? body.city.trim()
      : "Москва";

  if (!name || name.length > 80) {
    res.status(400).json({ error: "Invalid name" });
    return;
  }
  if (!specialty || specialty.length > 40) {
    res.status(400).json({ error: "Invalid specialty" });
    return;
  }

  try {
    await upsertUser(tg);
    const existing = await getProfile(tg.id);
    if (existing?.status === "active" && existing.onboarding_completed_at) {
      // Identity edits allowed, but onboarding stays completed.
      const profile = await upsertProfile({
        userId: tg.id,
        name,
        specialty,
        city,
      });
      res.json({ profile: serializeProfile(profile) });
      return;
    }

    const profile = await upsertProfile({
      userId: tg.id,
      name,
      specialty,
      city,
      duration: 60,
      price: 0,
      schedule: "weekday",
      status: "draft",
      onboardingStep: Math.max(existing?.onboarding_step ?? 1, 2),
    });
    res.json({ profile: serializeProfile(profile) });
  } catch (err) {
    console.error("[master.profile]", err);
    res.status(500).json({ error: "Failed to save master profile" });
  }
});

apiRouter.get("/master/services", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const services = await listServices(tg.id);
  res.json({ services: services.map(serializeService) });
});

apiRouter.put("/master/services/:id", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const id = String(req.params.id);
  const body = req.body ?? {};
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const durationMin = Number(body.durationMin);
  const price = Number(body.price);
  const priceMode = body.priceMode === "from" ? "from" : "fixed";
  const breakAfterMin = Number(body.breakAfterMin ?? 0);
  const description =
    typeof body.description === "string" ? body.description : "";

  if (!title || title.length > 120) {
    res.status(400).json({ error: "Invalid title" });
    return;
  }
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    res.status(400).json({ error: "Invalid durationMin" });
    return;
  }
  if (!Number.isFinite(price) || price <= 0) {
    res.status(400).json({ error: "Invalid price" });
    return;
  }

  try {
    await upsertUser(tg);
    let profile = await getProfile(tg.id);
    if (!profile) {
      profile = await upsertProfile({
        userId: tg.id,
        name: tg.first_name,
        duration: 60,
        price,
        schedule: "weekday",
      });
    }

    const service = await upsertService({
      id,
      masterId: tg.id,
      title,
      durationMin,
      price,
      priceMode,
      breakAfterMin: Number.isFinite(breakAfterMin) ? breakAfterMin : 0,
      description,
    });

    // Keep legacy profile defaults in sync with first/primary service.
    await upsertProfile({
      userId: tg.id,
      name: profile.name,
      duration: (durationMin === 50 || durationMin === 60
        ? durationMin
        : 60) as 50 | 60,
      price,
    });

    res.json({ service: serializeService(service) });
  } catch (err) {
    console.error("[master.services.put]", err);
    res.status(500).json({ error: "Failed to save service" });
  }
});

apiRouter.delete(
  "/master/services/:id",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    const ok = await deleteService(String(req.params.id), tg.id);
    if (!ok) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.json({ ok: true });
  },
);

/** Mark master onboarding finished (skip wizard next login). */
apiRouter.post(
  "/master/complete",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    const services = await listServices(tg.id);
    if (services.length === 0) {
      res.status(400).json({ error: "Add at least one service first" });
      return;
    }
    const profile = await markOnboardingComplete(tg.id);
    if (!profile) {
      res.status(400).json({ error: "Complete profile first" });
      return;
    }
    res.json({ profile: serializeProfile(profile) });
  },
);

apiRouter.put(
  "/master/onboarding-step",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    const step = Number(req.body?.step);
    if (!Number.isFinite(step) || step < 1 || step > 4) {
      res.status(400).json({ error: "step must be 1..4" });
      return;
    }
    const profile = await setOnboardingStep(tg.id, step);
    if (!profile) {
      res.status(404).json({ error: "Master profile not found" });
      return;
    }
    res.json({ profile: serializeProfile(profile) });
  },
);

apiRouter.get(
  "/psychologists/:id",
  requireSession,
  async (req: AuthedRequest, res) => {
    const raw = String(req.params.id);
    let profile: MasterProfileRow | null = null;

    if (/^\d+$/.test(raw)) {
      profile = await getProfile(Number(raw));
    } else {
      profile = await getProfileBySlug(raw);
    }

    if (!profile || profile.status !== "active") {
      res.status(404).json({ error: "Master not found" });
      return;
    }
    res.json({
      id: profile.user_id,
      slug: profile.slug,
      name: profile.name,
      duration: profile.duration,
      price: profile.price,
      schedule: profile.schedule,
      timezone: profile.timezone,
      cancelHours: profile.cancel_hours,
      specialty: profile.specialty,
      city: profile.city,
    });
  },
);

apiRouter.get(
  "/psychologists/:id/slots",
  requireSession,
  async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const raw = String(req.params.id);
    const profile = /^\d+$/.test(raw)
      ? await getProfile(Number(raw))
      : await getProfileBySlug(raw);
    if (!profile || profile.status !== "active") {
      res.status(404).json({ error: "Master not found" });
      return;
    }
    const days = Math.min(14, Math.max(1, Number(req.query.days ?? 7)));
    const slots = await generateSlots(profile, days);
    res.json({
      psychologist: {
        id: profile.user_id,
        name: profile.name,
        duration: profile.duration,
        price: profile.price,
      },
      slots,
    });
  },
);

apiRouter.get(
  "/cabinet/sessions",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    const profile = await getProfile(tg.id);
    if (!profile) {
      res.status(404).json({ error: "Complete onboarding first" });
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

    const rows = await listPsychologistBookings(
      tg.id,
      from.toISOString(),
      to.toISOString(),
    );

    res.json({
      sessions: rows.map((b) => ({
        id: b.id,
        startsAt: b.starts_at,
        time: formatTime(b.starts_at, tz),
        dateLabel: formatDateLabel(b.starts_at, tz),
        clientName: b.client_name,
        status: b.status,
        paid: b.paid,
      })),
      bookingLink: psychologistDeepLink(tg.id),
    });
  },
);

apiRouter.post(
  "/bookings",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    const psychologistId = Number(req.body?.psychologistId);
    const startsAt = String(req.body?.startsAt ?? "");

    if (!Number.isFinite(psychologistId) || !startsAt) {
      res.status(400).json({ error: "psychologistId and startsAt required" });
      return;
    }
    if (psychologistId === tg.id) {
      res.status(400).json({ error: "Cannot book yourself" });
      return;
    }

    const profile = await getProfile(psychologistId);
    if (!profile) {
      res.status(404).json({ error: "Psychologist not found" });
      return;
    }

    const slots = await generateSlots(profile, 14);
    const slot = slots.find((s) => s.startsAt === startsAt && s.available);
    if (!slot) {
      res.status(409).json({ error: "Slot unavailable" });
      return;
    }

    const clientName =
      [tg.first_name, tg.last_name].filter(Boolean).join(" ") || "Клиент";

    try {
      await upsertUser(tg);
      const booking = await createBooking({
        psychologistId,
        clientId: tg.id,
        clientName,
        startsAt,
        durationMin: profile.duration,
        price: profile.price,
      });

      void notifyBookingCreated({
        booking,
        psychologistName: profile.name,
        psychologistTimezone: profile.timezone,
      });

      res.status(201).json({
        booking: {
          id: booking.id,
          startsAt: booking.starts_at,
          time: formatTime(booking.starts_at, profile.timezone),
          date: formatDateLabel(booking.starts_at, profile.timezone),
          psychologistName: profile.name,
          duration: booking.duration_min,
          price: booking.price,
          status: booking.status,
        },
      });
    } catch (err) {
      if (err instanceof BookingConflictError) {
        res.status(409).json({ error: err.message });
        return;
      }
      console.error("[bookings.create]", err);
      res.status(500).json({ error: "Failed to create booking" });
    }
  },
);

apiRouter.get(
  "/bookings/mine",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    const rows = await listClientBookings(tg.id);
    const enriched = await Promise.all(
      rows.map(async (b) => {
        const profile = await getProfile(b.psychologist_id);
        const tz = profile?.timezone ?? "Europe/Moscow";
        return {
          id: b.id,
          startsAt: b.starts_at,
          date: formatDateLabel(b.starts_at, tz),
          time: formatTime(b.starts_at, tz),
          psychologistId: b.psychologist_id,
          psychologistName: profile?.name ?? "Психолог",
          duration: b.duration_min,
          price: b.price,
          status: b.status,
          cancelHours: profile?.cancel_hours ?? 24,
        };
      }),
    );
    res.json({ bookings: enriched });
  },
);

apiRouter.post(
  "/bookings/:id/cancel",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    const id = String(req.params.id);
    const existing = await getBooking(id);
    if (!existing) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const profile = await getProfile(existing.psychologist_id);
    const cancelHours =
      existing.psychologist_id === tg.id
        ? 0
        : (profile?.cancel_hours ?? 24);

    try {
      const booking = await cancelBooking(id, tg.id, cancelHours);
      if (profile) {
        void notifyBookingCancelled({
          booking,
          psychologistName: profile.name,
          psychologistTimezone: profile.timezone,
          by: existing.client_id === tg.id ? "client" : "psychologist",
        });
      }
      res.json({ ok: true, booking: { id: booking.id, status: booking.status } });
    } catch (err) {
      if (err instanceof BookingRuleError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error("[bookings.cancel]", err);
      res.status(500).json({ error: "Failed to cancel" });
    }
  },
);

apiRouter.post(
  "/bookings/:id/reschedule",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    const id = String(req.params.id);
    const startsAt = String(req.body?.startsAt ?? "");
    if (!startsAt) {
      res.status(400).json({ error: "startsAt required" });
      return;
    }

    const existing = await getBooking(id);
    if (!existing) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const profile = await getProfile(existing.psychologist_id);
    if (!profile) {
      res.status(404).json({ error: "Psychologist not found" });
      return;
    }

    const slots = await generateSlots(profile, 14);
    const slot = slots.find((s) => s.startsAt === startsAt && s.available);
    if (!slot && startsAt !== existing.starts_at) {
      res.status(409).json({ error: "Slot unavailable" });
      return;
    }

    try {
      const booking = await rescheduleBooking(
        id,
        tg.id,
        startsAt,
        profile.cancel_hours,
      );
      res.json({
        booking: {
          id: booking.id,
          startsAt: booking.starts_at,
          time: formatTime(booking.starts_at, profile.timezone),
          date: formatDateLabel(booking.starts_at, profile.timezone),
          status: booking.status,
        },
      });
    } catch (err) {
      if (err instanceof BookingConflictError || err instanceof BookingRuleError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error("[bookings.reschedule]", err);
      res.status(500).json({ error: "Failed to reschedule" });
    }
  },
);

apiRouter.post(
  "/bookings/:id/paid",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    try {
      const booking = await markPaid(String(req.params.id), tg.id);
      res.json({
        booking: {
          id: booking.id,
          status: booking.status,
          paid: booking.paid,
        },
      });
    } catch (err) {
      if (err instanceof BookingRuleError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error("[bookings.paid]", err);
      res.status(500).json({ error: "Failed to mark paid" });
    }
  },
);

apiRouter.get("/cron/reminders", async (req, res) => {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const headerSecret = String(req.headers["x-cron-secret"] ?? "");
  const ok =
    (config.cronSecret &&
      (token === config.cronSecret || headerSecret === config.cronSecret)) ||
    req.headers["x-vercel-cron"] === "1";

  if (!ok) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let sent = 0;
  for (const kind of ["24h", "1h"] as const) {
    const due = await listDueReminders(kind);
    for (const row of due) {
      await notifyReminder({
        clientId: row.client_telegram_id,
        psychologistName: row.psychologist_name,
        startsAt: row.starts_at,
        timezone: row.psychologist_timezone,
        kind,
      });
      await markReminded(row.id, kind);
      sent += 1;
    }
  }

  res.json({ ok: true, sent });
});
