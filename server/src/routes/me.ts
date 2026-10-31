import { Router } from "express";
import { config } from "../config.js";
import { getProfile } from "../db/profiles.js";
import { listServices } from "../db/services.js";
import { getUser } from "../db/users.js";
import { requireSession, type AuthedRequest } from "../middleware.js";
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
