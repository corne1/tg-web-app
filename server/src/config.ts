import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
loadEnv({ path: resolve(root, ".env") });

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
  webAppUrl: required("WEBAPP_URL", "http://localhost:5173"),
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  sessionSecret: required("SESSION_SECRET", "dev-session-secret-change-me"),
  isDevToken: isPlaceholderToken(botToken),
};
