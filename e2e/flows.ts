import { expect, type Page } from "@playwright/test";

export async function reachPublishReview(
  page: Page,
  input: { name: string; service: string; address: string },
): Promise<void> {
  const welcome = page.getByRole("button", { name: "Создать страницу мастера" });
  if (await welcome.isVisible()) await welcome.click();

  const name = page.getByPlaceholder("Анна");
  await expect(name).toBeVisible();
  await name.fill(input.name);
  await page.getByRole("radio", { name: "Маникюр", exact: true }).click();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();

  await page.getByRole("button", { name: "Добавить первую услугу" }).click();
  await page.getByPlaceholder("Маникюр с покрытием").fill(input.service);
  await page.getByPlaceholder("2500").first().fill("2500");
  await page.getByRole("button", { name: "Создать услугу" }).click();
  await expect(page.getByRole("listitem").getByText(input.service)).toBeVisible();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Когда вы принимаете клиентов?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();

  await page.getByRole("radio", { name: /В кабинете/ }).click();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByPlaceholder("Начните вводить название города").fill("Москва");
  await page.getByRole("button", { name: /^Москва/ }).click();
  await page.getByPlaceholder("Улица, дом, офис").fill(input.address);
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Проверьте профиль" }),
  ).toBeVisible();
}

export async function publishMaster(
  page: Page,
  input: { name: string; service: string; address: string },
): Promise<void> {
  await reachPublishReview(page, input);
  await page.getByRole("button", { name: "Опубликовать профиль" }).click();
  await expect(
    page.getByRole("heading", { name: "Профиль опубликован!" }),
  ).toBeVisible();
}

export async function openClientProfile(page: Page, slug: string): Promise<void> {
  await page.goto(`/client/${encodeURIComponent(slug)}`);
  await expect(page.getByRole("button", { name: "Записаться" })).toBeEnabled();
}

export async function bookClientSlot(
  page: Page,
  input: { service: string; clientName: string; day: "first" | "last" },
): Promise<string> {
  await page.getByRole("button", { name: "Записаться" }).click();
  await page
    .getByRole("checkbox", { name: new RegExp(input.service) })
    .click();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Когда вам удобно?" })).toBeVisible();

  const tabs = page.getByRole("tab");
  await expect(tabs.first()).toBeVisible();
  await (input.day === "first" ? tabs.first() : tabs.last()).click();
  const slot = page.locator(".ms-client-slot").first();
  await expect(slot).toBeVisible();
  const time = (await slot.innerText()).trim();
  await slot.click();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();

  await page.getByPlaceholder("Анна").fill(input.clientName);
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByRole("button", { name: "Подтвердить запись" }).click();
  await expect(page.getByRole("heading", { name: "Вы записаны!" })).toBeVisible();
  return time;
}

export async function pickMasterSlot(page: Page): Promise<void> {
  const days = page.locator(".ms-nb-cal-day.has-slots");
  await expect(days.first()).toBeVisible();
  const future = page.locator(".ms-nb-cal-day.has-slots:not(.is-today)");
  if ((await future.count()) > 0) {
    await future.first().click();
  } else {
    await page.getByRole("button", { name: "Следующий месяц" }).click();
    await expect(days.first()).toBeVisible();
    await days.first().click();
  }
  const slots = page.locator(".ms-nb-slot");
  await expect(slots.first()).toBeVisible();
  await slots.first().click();
}

export async function showScheduleCard(page: Page, clientName: string): Promise<void> {
  await page.goto("/cabinet");
  await expect(page.getByRole("heading", { name: "Расписание", exact: true })).toBeVisible();
  const card = page.getByRole("button", { name: new RegExp(clientName) });
  for (let week = 0; week < 3; week++) {
    const days = page.getByRole("option");
    const count = await days.count();
    for (let i = 0; i < count; i++) {
      await days.nth(i).click();
      if (await card.isVisible()) return;
    }
    await swipeWeek(page);
  }
  await expect(card).toBeVisible();
}

async function swipeWeek(page: Page): Promise<void> {
  const week = page.getByRole("listbox", { name: "Дни недели" });
  const box = await week.boundingBox();
  if (!box) throw new Error("week strip is not visible");
  const y = box.y + box.height / 2;
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width - 16, y }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [{ x: box.x + 16, y }],
  });
  await session.detach();
}
