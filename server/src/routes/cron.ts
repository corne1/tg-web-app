import { Router } from "express";
import { config } from "../config.js";
import { listDueReminders, markReminded } from "../db/bookings.js";
import { cronAuthorized } from "../lib/cronAuth.js";
import { notifyReminder } from "../services/notify.js";

export const cronRouter = Router();

cronRouter.get("/reminders", async (req, res) => {
  const headerSecret = req.headers["x-cron-secret"];
  const ok = cronAuthorized({
    authorization: req.headers.authorization,
    cronSecretHeader: Array.isArray(headerSecret) ? headerSecret[0] : headerSecret,
    expectedSecret: config.cronSecret,
  });

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
        masterName: row.master_name,
        startsAt: row.starts_at,
        timezone: row.master_timezone,
        kind,
      });
      await markReminded(row.id, kind);
      sent += 1;
    }
  }

  res.json({ ok: true, sent });
});
