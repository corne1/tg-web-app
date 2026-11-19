import { expect, type Browser, type Page } from "@playwright/test";
import { e2eSecret } from "./playwright.config.ts";

const TOKEN_KEY = "tg_session";

let nextUserId = Date.now();

export function uniqueUserId(): number {
  nextUserId += 1;
  return nextUserId;
}

export async function login(
  page: Page,
  user: { id: number; firstName: string; isTest?: boolean },
  path = "/",
): Promise<{ token: string; slug: string | null }> {
  const res = await page.request.post("/api/auth/e2e", {
    data: {
      secret: e2eSecret,
      userId: user.id,
      firstName: user.firstName,
      ...(user.isTest ? { isTest: true } : {}),
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as { token: string };
  await page.addInitScript(
    ([key, token]) => {
      localStorage.setItem(key, token);
    },
    [TOKEN_KEY, body.token] as const,
  );
  await page.goto(path);
  await expect(page.getByText("Подключение…")).toBeHidden();

  const me = await page.request.get("/api/me", {
    headers: { Authorization: `Bearer ${body.token}` },
  });
  expect(me.ok()).toBeTruthy();
  const profile = (await me.json()) as { profile: { slug?: string } | null };
  return { token: body.token, slug: profile.profile?.slug ?? null };
}

/** Separate cookie jar and localStorage from other users in the same test. */
export async function openUser(
  browser: Browser,
  user: { id: number; firstName: string; isTest?: boolean },
  path = "/",
): Promise<{ page: Page; token: string; slug: string | null; close: () => Promise<void> }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const session = await login(page, user, path);
  return {
    page,
    token: session.token,
    slug: session.slug,
    close: () => context.close(),
  };
}
