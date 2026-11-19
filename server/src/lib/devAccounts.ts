export type DevAccount = {
  id: number;
  firstName: string;
};

/** Local-only masters. Ids stay out of the range a real Telegram user would reuse here. */
export const DEV_ACCOUNTS: readonly DevAccount[] = [
  { id: 8800000001, firstName: "Тест 1" },
  { id: 8800000002, firstName: "Тест 2" },
  { id: 8800000003, firstName: "Тест 3" },
];

/**
 * Browser logins for re-running onboarding.
 * Off on Vercel and when NODE_ENV=production. No secret: only the three ids above can be used.
 */
export function devAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERCEL) return false;
  if (env.NODE_ENV === "production") return false;
  return true;
}

export function findDevAccount(id: number): DevAccount | null {
  return DEV_ACCOUNTS.find((account) => account.id === id) ?? null;
}
