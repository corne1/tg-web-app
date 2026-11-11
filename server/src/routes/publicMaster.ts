import { Router } from "express";
import { getProfile, getProfileBySlug } from "../db/profiles.js";
import { listServices } from "../db/services.js";
import type { MasterProfileRow } from "../db/types.js";
import { requireSession, type AuthedRequest } from "../middleware.js";
import { generateSlots } from "../services/slots.js";
import { serializePublicMaster } from "./serializers.js";

export const publicMasterRouter = Router();

async function resolveActiveProfile(
  rawParam: string,
): Promise<MasterProfileRow | null> {
  const raw = decodeURIComponent(rawParam);
  const profile = /^\d+$/.test(raw)
    ? await getProfile(Number(raw))
    : await getProfileBySlug(raw);
  if (!profile || profile.status !== "active") return null;
  return profile;
}

async function handleGetMaster(req: AuthedRequest, res: import("express").Response) {
  const profile = await resolveActiveProfile(String(req.params.id));
  if (!profile) {
    res.status(404).json({ error: "Master not found" });
    return;
  }
  const services = await listServices(profile.user_id);
  res.json(serializePublicMaster(profile, services));
}

async function handleGetSlots(req: AuthedRequest, res: import("express").Response) {
  const profile = await resolveActiveProfile(String(req.params.id));
  if (!profile) {
    res.status(404).json({ error: "Master not found" });
    return;
  }
  const days = Math.min(14, Math.max(1, Number(req.query.days ?? 7)));
  const durationRaw = Number(req.query.duration);
  const durationMin =
    Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : undefined;
  const visit =
    req.query.visit === "1" ||
    req.query.visit === "true" ||
    req.query.place === "visit";
  const travelBufferMin = visit
    ? (profile.travel_buffer_min ?? 30)
    : undefined;
  const slots = await generateSlots(profile, days, {
    durationMin,
    travelBufferMin,
  });
  res.json({
    master: {
      id: profile.user_id,
      name: profile.name,
      duration: durationMin ?? profile.duration,
      price: profile.price,
      travelBufferMin: visit ? (travelBufferMin ?? null) : null,
    },
    slots,
  });
}

publicMasterRouter.get("/:id", requireSession, handleGetMaster);
publicMasterRouter.get("/:id/slots", requireSession, handleGetSlots);
