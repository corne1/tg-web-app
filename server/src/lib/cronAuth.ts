import { timingSafeEqual } from "node:crypto";

function secretEquals(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that env var is set.
 * `x-vercel-cron` is not a secret: any client can send it.
 */
export function cronAuthorized(input: {
  authorization?: string;
  cronSecretHeader?: string;
  expectedSecret: string;
}): boolean {
  if (input.expectedSecret.length < 16) return false;
  const bearer = input.authorization?.startsWith("Bearer ")
    ? input.authorization.slice("Bearer ".length)
    : "";
  if (secretEquals(bearer, input.expectedSecret)) return true;
  return secretEquals(input.cronSecretHeader ?? "", input.expectedSecret);
}
