import { timingSafeEqual } from "node:crypto";

/**
 * Test login exists only for a local Playwright run.
 * Disabled on Vercel, in production, and when E2E_SECRET is absent.
 */
export function e2eAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = env.E2E_SECRET ?? "";
  if (secret.length < 8) return false;
  if (env.VERCEL) return false;
  if (env.NODE_ENV === "production") return false;
  return true;
}

export function e2eSecretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
