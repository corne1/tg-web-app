import { Router } from "express";
import {
  ensureMasterProfile,
  getProfile,
  markOnboardingComplete,
  setMasterAvatarUrl,
  setOnboardingStep,
  upsertProfile,
} from "../db/profiles.js";
import {
  deleteService,
  listServices,
  upsertService,
} from "../db/services.js";
import { isValidServiceTypeCode } from "../db/serviceTypes.js";
import { upsertUser } from "../db/users.js";
import {
  isMasterPlaceValid,
  normalizeMasterPlace,
  primaryCityFromPlace,
} from "../lib/place.js";
import {
  hasEnabledWorkingDay,
  normalizeWorkingHours,
} from "../lib/workingHours.js";
import { requireSession, type AuthedRequest } from "../middleware.js";
import { serializeProfile, serializeService } from "./serializers.js";

export const masterRouter = Router();

/**
 * Enter master context: get-or-create draft profile for this Telegram user.
 * Never recreates an active completed profile.
 */
masterRouter.post("/ensure", requireSession, async (req: AuthedRequest, res) => {
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
masterRouter.put("/profile", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const body = req.body ?? {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const serviceTypeCode =
    typeof body.serviceTypeCode === "string"
      ? body.serviceTypeCode.trim()
      : "";
  const city =
    typeof body.city === "string" && body.city.trim()
      ? body.city.trim()
      : "Москва";

  if (!name || name.length > 80) {
    res.status(400).json({ error: "Invalid name" });
    return;
  }
  if (!serviceTypeCode || serviceTypeCode.length > 40) {
    res.status(400).json({ error: "Invalid serviceTypeCode" });
    return;
  }
  if (!(await isValidServiceTypeCode(serviceTypeCode))) {
    res.status(400).json({ error: "Unknown service type" });
    return;
  }

  try {
    await upsertUser(tg);
    const existing = await getProfile(tg.id);
    const aboutRaw = body.about ?? body.aboutText;
    const aboutText =
      typeof aboutRaw === "string" ? aboutRaw : undefined;

    if (existing?.status === "active" && existing.onboarding_completed_at) {
      const profile = await upsertProfile({
        userId: tg.id,
        name,
        serviceTypeCode,
        city,
        aboutText,
      });
      res.json({ profile: serializeProfile(profile) });
      return;
    }

    const profile = await upsertProfile({
      userId: tg.id,
      name,
      serviceTypeCode,
      city,
      aboutText,
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

/** Persist master avatar (TG URL or gallery data-URL). Blur #16. */
masterRouter.put("/avatar", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const body = req.body ?? {};
  const raw = body.avatarUrl;
  const avatarUrl =
    raw === null || raw === undefined
      ? null
      : typeof raw === "string"
        ? raw.trim() || null
        : null;

  try {
    await upsertUser(tg);
    await ensureMasterProfile(
      tg.id,
      [tg.first_name, tg.last_name].filter(Boolean).join(" "),
    );
    const next = await setMasterAvatarUrl(tg.id, avatarUrl);
    if (!next) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json({ profile: serializeProfile(next) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("too large")) {
      res.status(413).json({ error: "Avatar too large" });
      return;
    }
    console.error("[master.avatar]", err);
    res.status(500).json({ error: "Failed to save avatar" });
  }
});

/** Persist onboarding reception place (step 4). */
masterRouter.put("/place", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const body = req.body ?? {};
  const place = normalizeMasterPlace(body.place ?? body);

  if (!place || !isMasterPlaceValid(place)) {
    res.status(400).json({ error: "Invalid place" });
    return;
  }

  try {
    await upsertUser(tg);
    let profile = await getProfile(tg.id);
    if (!profile) {
      profile = await ensureMasterProfile(
        tg.id,
        [tg.first_name, tg.last_name].filter(Boolean).join(" "),
      );
    }
    const city = primaryCityFromPlace(place) ?? profile.city;
    const travelRaw = body.travelBufferMin;
    const travelBufferMin =
      travelRaw === null || travelRaw === undefined || travelRaw === ""
        ? undefined
        : Number(travelRaw);
    if (
      travelBufferMin !== undefined &&
      (!Number.isFinite(travelBufferMin) ||
        travelBufferMin < 0 ||
        travelBufferMin > 240)
    ) {
      res.status(400).json({ error: "Invalid travelBufferMin" });
      return;
    }
    const next = await upsertProfile({
      userId: tg.id,
      name: profile.name,
      place,
      city,
      travelBufferMin:
        place.mode === "studio"
          ? null
          : travelBufferMin !== undefined
            ? travelBufferMin
            : (profile.travel_buffer_min ?? 30),
      onboardingStep: Math.max(profile.onboarding_step, 4),
    });
    res.json({ profile: serializeProfile(next) });
  } catch (err) {
    console.error("[master.place]", err);
    res.status(500).json({ error: "Failed to save place" });
  }
});

/** Persist onboarding working hours (source of truth for slot generation). */
masterRouter.put("/hours", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const body = req.body ?? {};
  const hours = normalizeWorkingHours(body.hours ?? body.workingHours);
  const dayBreakRaw = body.dayBreakMin;
  const dayBreakMin =
    dayBreakRaw === null || dayBreakRaw === undefined || dayBreakRaw === ""
      ? null
      : Number(dayBreakRaw);

  if (!hours || !hasEnabledWorkingDay(hours)) {
    res.status(400).json({ error: "At least one working day required" });
    return;
  }
  if (
    dayBreakMin != null &&
    (!Number.isFinite(dayBreakMin) || dayBreakMin < 0 || dayBreakMin > 240)
  ) {
    res.status(400).json({ error: "Invalid dayBreakMin" });
    return;
  }

  try {
    await upsertUser(tg);
    let profile = await getProfile(tg.id);
    if (!profile) {
      profile = await ensureMasterProfile(
        tg.id,
        [tg.first_name, tg.last_name].filter(Boolean).join(" "),
      );
    }
    const next = await upsertProfile({
      userId: tg.id,
      name: profile.name,
      workingHours: hours,
      dayBreakMin,
      onboardingStep: Math.max(profile.onboarding_step, 3),
    });
    res.json({ profile: serializeProfile(next) });
  } catch (err) {
    console.error("[master.hours]", err);
    res.status(500).json({ error: "Failed to save hours" });
  }
});

masterRouter.get("/services", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const services = await listServices(tg.id);
  res.json({ services: services.map(serializeService) });
});

masterRouter.put("/services/:id", requireSession, async (req: AuthedRequest, res) => {
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

    res.json({ service: serializeService(service) });
  } catch (err) {
    console.error("[master.services.put]", err);
    res.status(500).json({ error: "Failed to save service" });
  }
});

masterRouter.delete(
  "/services/:id",
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
masterRouter.post(
  "/complete",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    const body = req.body ?? {};
    const hours = normalizeWorkingHours(body.hours ?? body.workingHours);
    const dayBreakRaw = body.dayBreakMin;
    const dayBreakMin =
      dayBreakRaw === null || dayBreakRaw === undefined || dayBreakRaw === ""
        ? undefined
        : Number(dayBreakRaw);
    const place = normalizeMasterPlace(body.place);

    if (hours) {
      if (!hasEnabledWorkingDay(hours)) {
        res.status(400).json({ error: "At least one working day required" });
        return;
      }
      await upsertProfile({
        userId: tg.id,
        workingHours: hours,
        dayBreakMin:
          dayBreakMin !== undefined && Number.isFinite(dayBreakMin)
            ? dayBreakMin
            : null,
      });
    }

    if (place) {
      if (!isMasterPlaceValid(place)) {
        res.status(400).json({ error: "Invalid place" });
        return;
      }
      const existing = await getProfile(tg.id);
      await upsertProfile({
        userId: tg.id,
        place,
        city: primaryCityFromPlace(place) ?? existing?.city,
      });
    }

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

masterRouter.put(
  "/onboarding-step",
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
