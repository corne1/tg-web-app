import { Router } from "express";
import { listServiceTypes } from "../db/serviceTypes.js";

export const serviceTypesRouter = Router();

/** Public catalog of service kinds (specialty dictionary). */
serviceTypesRouter.get("/", async (_req, res) => {
  try {
    const rows = await listServiceTypes(true);
    res.json({
      serviceTypes: rows.map((r) => ({
        code: r.code,
        label: r.label,
        title: r.title,
        sortOrder: r.sort_order,
      })),
    });
  } catch (err) {
    console.error("[serviceTypes.list]", err);
    res.status(500).json({ error: "Failed to load service types" });
  }
});
