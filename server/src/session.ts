import { SignJWT, jwtVerify } from "jose";
import { config } from "./config.js";
import type { TelegramUser } from "./telegramAuth.js";

const secret = new TextEncoder().encode(config.sessionSecret);

export type SessionPayload = {
  sub: string;
  user: TelegramUser;
};

export async function createSessionToken(user: TelegramUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret);
  if (!payload.sub || !payload.user) {
    throw new Error("Invalid session payload");
  }
  return {
    sub: payload.sub,
    user: payload.user as TelegramUser,
  };
}
