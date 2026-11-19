/**
 * Local test-account gate. Run: npx tsx src/lib/devAccounts.test.ts
 */
import { devAuthEnabled, findDevAccount } from "./devAccounts.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(devAuthEnabled({}) === true, "enabled for a local process");
assert(
  devAuthEnabled({ VERCEL: "1" }) === false,
  "disabled on Vercel",
);
assert(
  devAuthEnabled({ NODE_ENV: "production" }) === false,
  "disabled in production",
);
assert(findDevAccount(8800000001)?.firstName === "Тест 1", "known account");
assert(findDevAccount(1) === null, "real user id is not a test account");

console.log("devAccounts.test.ts: ok");
