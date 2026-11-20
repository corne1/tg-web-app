/**
 * Auth rate limit. Run: npx tsx src/lib/rateLimit.test.ts
 */
import { createRateLimiter, requestClientKey } from "./rateLimit.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const limiter = createRateLimiter(2, 1_000);
assert(limiter.allow("a", 0), "first hit allowed");
assert(limiter.allow("a", 10), "second hit allowed");
assert(!limiter.allow("a", 20), "third hit inside the window blocked");
assert(limiter.allow("b", 20), "other key is independent");
assert(limiter.allow("a", 1_001), "hit after the window allowed");

assert(
  requestClientKey("203.0.113.5, 10.0.0.1", "127.0.0.1", true) === "203.0.113.5",
  "trusted proxy uses the first forwarded address",
);
assert(
  requestClientKey("203.0.113.5", "127.0.0.1", false) === "127.0.0.1",
  "untrusted proxy ignores X-Forwarded-For",
);
assert(requestClientKey(undefined, undefined, false) === "unknown", "missing address");

console.log("rateLimit.test.ts: ok");
