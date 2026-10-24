import { createHmac } from "node:crypto";
import { validateInitData } from "./telegramAuth.js";

const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

function sign(params: Record<string, string>): string {
  const pairs = Object.entries(params)
    .filter(([k]) => k !== "hash")
    .map(([k, v]) => `${k}=${v}`)
    .sort();
  const dataCheckString = pairs.join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  return createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
}

const user = JSON.stringify({
  id: 42,
  first_name: "Ada",
  username: "ada",
});

const authDate = String(Math.floor(Date.now() / 1000));
const base = { auth_date: authDate, user };
const hash = sign(base);
const initData = new URLSearchParams({ ...base, hash }).toString();

const validated = validateInitData(initData, botToken);
if (validated.user.id !== 42 || validated.user.first_name !== "Ada") {
  throw new Error("Unexpected user");
}

let failed = false;
try {
  validateInitData(initData, "wrong-token");
} catch {
  failed = true;
}
if (!failed) throw new Error("Expected invalid signature");

console.log("telegramAuth.test.ts: ok");
