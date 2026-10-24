import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

export type ValidatedInitData = {
  user: TelegramUser;
  authDate: number;
  queryId?: string;
  raw: Record<string, string>;
};

/**
 * Validates Telegram Mini App initData per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): ValidatedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new AuthError("Missing hash");
  }

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const hashBuf = Buffer.from(hash, "hex");
  const calcBuf = Buffer.from(calculated, "hex");
  if (hashBuf.length !== calcBuf.length || !timingSafeEqual(hashBuf, calcBuf)) {
    throw new AuthError("Invalid initData signature");
  }

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw) {
    throw new AuthError("Missing auth_date");
  }
  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate)) {
    throw new AuthError("Invalid auth_date");
  }
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > maxAgeSeconds) {
    throw new AuthError("initData expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new AuthError("Missing user");
  }

  let user: TelegramUser;
  try {
    user = JSON.parse(userRaw) as TelegramUser;
  } catch {
    throw new AuthError("Invalid user JSON");
  }
  if (!user?.id || !user?.first_name) {
    throw new AuthError("Invalid user payload");
  }

  const raw: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    raw[key] = value;
  }

  return {
    user,
    authDate,
    queryId: params.get("query_id") ?? undefined,
    raw,
  };
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
