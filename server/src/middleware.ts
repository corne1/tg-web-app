import type { NextFunction, Request, Response } from "express";
import { verifySessionToken } from "./session.js";
import type { TelegramUser } from "./telegramAuth.js";

export type AuthedRequest = Request & {
  telegramUser?: TelegramUser;
};

export async function requireSession(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : cookies?.session;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const session = await verifySessionToken(token);
    req.telegramUser = session.user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
}

/** Minimal cookie parser without extra dependency. */
export function parseCookies(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.cookie;
  const cookies: Record<string, string> = {};
  if (header) {
    for (const part of header.split(";")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      const value = decodeURIComponent(part.slice(idx + 1).trim());
      cookies[key] = value;
    }
  }
  (req as Request & { cookies: Record<string, string> }).cookies = cookies;
  next();
}
