import { Router } from "express";
import { requireSession, type AuthedRequest } from "../middleware.js";
import {
  resolveRussiaCity,
  searchRussiaCities,
} from "../services/cities.js";

export const citiesRouter = Router();

/** Search Russian cities (HH areas API, cached). */
citiesRouter.get("/", requireSession, async (req: AuthedRequest, res) => {
  const q = String(req.query.q ?? "");
  const limit = Number(req.query.limit ?? 8);
  try {
    if (req.query.resolve === "1" || req.query.resolve === "true") {
      const city = await resolveRussiaCity(q);
      res.json({ city });
      return;
    }
    const cities = await searchRussiaCities(q, Number.isFinite(limit) ? limit : 8);
    res.json({ cities });
  } catch (err) {
    console.error("[cities]", err);
    res.status(502).json({ error: "City search unavailable" });
  }
});
