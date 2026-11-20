export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    allow(key: string, now = Date.now()): boolean {
      const recent = (hits.get(key) ?? []).filter((ts) => now - ts < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
  };
}

/** On Vercel the platform sets X-Forwarded-For. Elsewhere that header is client-controlled. */
export function requestClientKey(
  forwardedFor: string | string[] | undefined,
  remoteAddress: string | undefined,
  trustForwarded: boolean,
): string {
  if (trustForwarded) {
    const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const first = raw?.split(",")[0]?.trim();
    if (first) return first;
  }
  return remoteAddress || "unknown";
}
