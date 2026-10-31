import { Router } from "express";
import { bookingDeepLink, masterDeepLink } from "../config.js";
import { listMasterBookings } from "../db/bookings.js";
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
      bookingLink: bookingDeepLink(profile.slug) ?? masterDeepLink(tg.id),
      onboardingComplete: true,
      onboardingStep: profile.onboarding_step,
      profile: serializeProfile(profile),
    });
  },
);
