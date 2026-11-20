/**
 * Route gates that do not touch the database.
 * Run: npx tsx src/routes/http.smoke.test.ts
 */
import type { Server } from "node:http";
import { createApp } from "../app.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const app = createApp();
const server: Server = await new Promise((resolve) => {
  const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
});
const address = server.address();
if (!address || typeof address === "string") throw new Error("no port");
const base = `http://127.0.0.1:${address.port}`;

try {
  const health = await fetch(`${base}/api/health`);
  assert(health.status === 200, "health status");
  const healthBody = (await health.json()) as { ok?: boolean };
  assert(healthBody.ok === true, "health body");

  const cron = await fetch(`${base}/api/cron/reminders`);
  assert(cron.status === 401, "cron without a secret");

  const auth = await fetch(`${base}/api/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert(auth.status === 400, "telegram auth without initData");
} finally {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

console.log("http.smoke.test.ts: ok");
