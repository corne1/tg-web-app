import { Router } from "express";
import { config } from "../config.js";
import { setUserTest, upsertUser } from "../db/users.js";
import { e2eAuthEnabled, e2eSecretMatches } from "../lib/e2eAuth.js";
import { createRateLimiter, requestClientKey } from "../lib/rateLimit.js";
import { createSessionToken } from "../session.js";
import { AuthError, validateInitData } from "../telegramAuth.js";

export const authRouter = Router();

const telegramAuthLimiter = createRateLimiter(30, 60_000);

/**
 * Exchange Telegram initData for a session JWT and upsert user.
 * Body: { initData: string }
 */
authRouter.post("/telegram", async (req, res) => {
  const clientKey = requestClientKey(
    req.headers["x-forwarded-for"],
    req.socket.remoteAddress,
    Boolean(process.env.VERCEL),
  );
  if (!telegramAuthLimiter.allow(clientKey)) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const initData = req.body?.initData;
  if (typeof initData !== "string" || !initData) {
    res.status(400).json({ error: "initData required" });
    return;
  }

  try {
    const validated = validateInitData(initData, config.botToken);
    const user = await upsertUser(validated.user);
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

/**
 * Session for Playwright. Absent unless E2E_SECRET is set on a non-production process.
 * Body: { secret, userId, firstName, isTest? }
 * isTest writes users.is_test. Telegram login never does.
 */
authRouter.post("/e2e", async (req, res) => {
  if (!e2eAuthEnabled()) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const expected = process.env.E2E_SECRET ?? "";
  const provided = String(req.body?.secret ?? "");
  if (!e2eSecretMatches(provided, expected)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = Number(req.body?.userId);
  const firstName = String(req.body?.firstName ?? "").trim();
  if (!Number.isInteger(id) || id <= 0 || !firstName) {
    res.status(400).json({ error: "userId and firstName required" });
    return;
  }

  const user = {
    id,
    first_name: firstName,
    username: `e2e_${id}`,
    language_code: "ru",
  };
  const stored = await upsertUser(user);
  if (req.body?.isTest === true) {
    await setUserTest(id, true);
    stored.is_test = true;
  }
  const token = await createSessionToken(user);
  res.json({ token, user: stored });
});
