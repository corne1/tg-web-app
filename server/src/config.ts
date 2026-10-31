import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Local .env only — on Vercel use Project Environment Variables.
if (!process.env.VERCEL) {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    loadEnv({ path: resolve(root, ".env") });
    loadEnv();
  } catch {
    loadEnv();
  }
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

const botToken = required("BOT_TOKEN", "000000:REPLACE_ME");

function isPlaceholderToken(token: string): boolean {
  return (
    token === "000000:REPLACE_ME" ||
    token.includes("ABC-DEF") ||
    token.endsWith("...") ||
    !token.includes(":")
  );
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  botToken,
  botUsername: (process.env.BOT_USERNAME ?? "").replace(/^@/, ""),
  webAppUrl: required("WEBAPP_URL", "http://localhost:5173"),
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  sessionSecret: required("SESSION_SECRET", "dev-session-secret-change-me"),
  isDevToken: isPlaceholderToken(botToken),
  databaseUrl: process.env.DATABASE_URL ?? "",
  databaseAuthToken: process.env.DATABASE_AUTH_TOKEN ?? undefined,
  cronSecret: process.env.CRON_SECRET ?? "",
};

/** Fallback deep link by Telegram user id (`startapp=p_<id>`). Prefer bookingDeepLink(slug). */
export function masterDeepLink(masterId: number): string | null {
  if (!config.botUsername) return null;
  return `https://t.me/${config.botUsername}?startapp=p_${masterId}`;
}

export function bookingDeepLink(slug: string): string | null {
  if (!config.botUsername || !slug) return null;
  return `https://t.me/${config.botUsername}?startapp=book_${encodeURIComponent(slug)}`;
}

export function cabinetDeepLink(): string | null {
  if (!config.botUsername) return null;
  return `https://t.me/${config.botUsername}?startapp=cabinet`;
}
