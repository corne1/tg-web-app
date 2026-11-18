/**
 * E2E login gate. Run: npx tsx src/lib/e2eAuth.test.ts
 */
import { e2eAuthEnabled, e2eSecretMatches } from "./e2eAuth.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(
  e2eAuthEnabled({ E2E_SECRET: "e2e-local-secret" }) === true,
  "enabled with a local secret",
);
assert(e2eAuthEnabled({}) === false, "disabled without a secret");
assert(
  e2eAuthEnabled({ E2E_SECRET: "short" }) === false,
  "disabled when the secret is too short",
);
assert(
  e2eAuthEnabled({ E2E_SECRET: "e2e-local-secret", VERCEL: "1" }) === false,
  "disabled on Vercel",
);
assert(
  e2eAuthEnabled({
    E2E_SECRET: "e2e-local-secret",
    NODE_ENV: "production",
  }) === false,
  "disabled in production",
);
assert(
  e2eSecretMatches("e2e-local-secret", "e2e-local-secret"),
  "secret matches",
);
assert(
  !e2eSecretMatches("e2e-local-secret", "e2e-other-secret"),
  "wrong secret rejected",
);
assert(!e2eSecretMatches("short", "e2e-local-secret"), "length mismatch rejected");

console.log("e2eAuth.test.ts: ok");
