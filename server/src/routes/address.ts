import { Router } from "express";
import { requireSession, type AuthedRequest } from "../middleware.js";
import { suggestAddresses } from "../services/addressSuggest.js";

export const addressRouter = Router();

addressRouter.get("/", requireSession, async (req: AuthedRequest, res) => {
  const q = String(req.query.q ?? "").trim();
  const limit = Number(req.query.limit ?? 6);
  try {
    const suggestions = await suggestAddresses(
      q,
      Number.isFinite(limit) ? limit : 6,
    );
    res.json({ suggestions });
  } catch (err) {
    console.error("[address.suggest]", err);
    res.json({ suggestions: [] });
  }
});
