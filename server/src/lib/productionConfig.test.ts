/**
 * Production env gate. Run: npx tsx src/lib/productionConfig.test.ts
 */
import { productionConfigError, type ProductionCheckInput } from "./productionConfig.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function input(overrides: Partial<ProductionCheckInput> = {}): ProductionCheckInput {
  return {
    nodeEnv: "production",
    vercel: undefined,
    botToken: "123456:real-token",
    sessionSecret: "real-session-secret",
    sessionSecretConfigured: true,
    webAppUrl: "https://app.example",
    webAppUrlConfigured: true,
    cronSecret: "cron-secret-value",
    databaseUrl: "libsql://db.example",
    ...overrides,
  };
}

assert(productionConfigError(input()) === null, "complete production config passes");
assert(
  productionConfigError(input({ nodeEnv: "development", botToken: "000000:REPLACE_ME" })) ===
    null,
  "dev keeps placeholder token",
);
assert(
  productionConfigError(input({ vercel: "1", nodeEnv: undefined, botToken: "000000:REPLACE_ME" })) !==
    null,
  "Vercel rejects placeholder token",
);
assert(
  productionConfigError(input({ sessionSecretConfigured: false })) !== null,
  "missing SESSION_SECRET rejected",
);
assert(
  productionConfigError(
    input({
      sessionSecret: "dev-session-secret-change-me",
      sessionSecretConfigured: true,
    }),
  ) !== null,
  "dev session placeholder rejected",
);
assert(
  productionConfigError(input({ webAppUrl: "http://localhost:5173", webAppUrlConfigured: true })) !==
    null,
  "localhost WEBAPP_URL rejected",
);
assert(
  productionConfigError(input({ cronSecret: "" })) !== null,
  "missing CRON_SECRET rejected",
);
assert(
  productionConfigError(input({ databaseUrl: "" })) !== null,
  "missing DATABASE_URL rejected",
);

console.log("productionConfig.test.ts: ok");
