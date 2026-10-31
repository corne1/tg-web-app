import { Router } from "express";
import { config } from "../config.js";
import { getProfile } from "../db/profiles.js";
import { listServices } from "../db/services.js";
import { getUser } from "../db/users.js";
import { requireSession, type AuthedRequest } from "../middleware.js";
import type { ScheduleKind } from "../db/types.js";
import { upsertProfile } from "../db/profiles.js";
import { upsertUser } from "../db/users.js";
import { serializeProfile, serializeService } from "./serializers.js";

export const meRouter = Router();

meRouter.get("/me", requireSession, async (req: AuthedRequest, res) => {
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

meRouter.get("/config/public", (_req, res) => {
  res.json({
    botUsername: config.botUsername || null,
  });
});

/** Legacy single-step profile update. */
meRouter.put("/profile", requireSession, async (req: AuthedRequest, res) => {
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
