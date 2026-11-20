/**
 * Cron gate. Run: npx tsx src/lib/cronAuth.test.ts
 */
import { cronAuthorized } from "./cronAuth.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const secret = "cron-secret-value";

assert(
  cronAuthorized({
    authorization: `Bearer ${secret}`,
    expectedSecret: secret,
  }),
  "bearer secret accepted",
);
assert(
  cronAuthorized({
    cronSecretHeader: secret,
    expectedSecret: secret,
  }),
  "x-cron-secret accepted",
);
assert(
  !cronAuthorized({
    authorization: "Bearer wrong-secret-value",
    expectedSecret: secret,
  }),
  "wrong bearer rejected",
);
assert(
  !cronAuthorized({
    authorization: "Bearer 1",
    expectedSecret: secret,
  }),
  "short bearer rejected",
);
assert(
  !cronAuthorized({ expectedSecret: "" }),
  "empty secret rejects every caller",
);
assert(
  !cronAuthorized({ expectedSecret: "short" }),
  "short configured secret rejects every caller",
);

console.log("cronAuth.test.ts: ok");
