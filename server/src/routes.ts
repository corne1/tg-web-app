import { Router } from "express";
import { upsertUser, getUser } from "./db.js";
import { AuthError, validateInitData } from "./telegramAuth.js";
import { createSessionToken } from "./session.js";
import { config } from "./config.js";
import { requireSession, type AuthedRequest } from "./middleware.js";

export const apiRouter = Router();

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
    const user = upsertUser(validated.user);
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

apiRouter.get("/me", requireSession, (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const stored = getUser(tg.id);
  res.json({ user: stored ?? tg });
});
