import { expect, test } from "@playwright/test";
import { login, openUser, uniqueUserId } from "./auth.ts";
import {
  bookClientSlot,
  pickMasterSlot,
  publishMaster,
  reachPublishReview,
  showScheduleCard,
} from "./flows.ts";

test("cabinet edits show on the public page and in slots", async ({ browser }) => {
  const masterId = uniqueUserId();
  const clientId = uniqueUserId();
  const service = `Маникюр ${masterId}`;
  const renamed = `Педикюр ${masterId}`;
  const address = `Новый адрес ${masterId}`;

  const master = await openUser(browser, { id: masterId, firstName: "Мастер Правок" });
  await publishMaster(master.page, {
    name: "Мастер Правок",
    service,
    address: `Старый адрес ${masterId}`,
  });
  await master.page.getByRole("button", { name: "Перейти в расписание" }).click();
  await master.page.getByRole("link", { name: "Профиль" }).click();

  await master.page.getByRole("button", { name: "Мои услуги" }).click();
  await master.page.getByRole("button", { name: "Действия" }).click();
  await master.page.getByRole("menuitem", { name: "Редактировать" }).click();
  await master.page.getByPlaceholder("Маникюр с покрытием").fill(renamed);
  await master.page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(master.page.getByText(renamed)).toBeVisible();

  await master.page.goto("/cabinet/profile");
  await master.page.getByRole("button", { name: "Место приёма" }).click();
  await master.page.getByRole("button", { name: /Кабинет/ }).click();
  await master.page.getByPlaceholder("Улица, дом, офис").fill(address);
  await master.page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(master.page.getByText("Сохранено")).toBeVisible();

  await master.page.goto("/cabinet/profile/hours");
  const saturday = master.page.locator(".ms-day-card", { hasText: "Суббота" });
  await saturday.getByRole("switch").click();
  await saturday.locator(".ms-time-chip").nth(1).click();
  await master.page.getByRole("button", { name: "Выбрать другое время" }).click();
  await master.page.getByRole("combobox", { name: "Часы" }).selectOption("12");
  await master.page.getByRole("combobox", { name: "Минуты" }).selectOption("0");
  await master.page.getByRole("button", { name: "Применить" }).click();
  await expect(saturday.locator(".ms-time-chip").nth(1)).toHaveText("12:00");
  await master.page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(master.page).toHaveURL(/\/cabinet\/profile$/);

  const me = await master.page.request.get("/api/me", {
    headers: { Authorization: `Bearer ${master.token}` },
  });
  const slug = ((await me.json()) as { profile: { slug: string } }).profile.slug;
  const client = await openUser(
    browser,
    { id: clientId, firstName: "Клиент" },
    `/client/${slug}`,
  );
  await expect(client.page.getByText(renamed)).toBeVisible();
  await expect(client.page.getByText(`Москва, ${address}`)).toBeVisible();

  await client.page.getByRole("button", { name: "Записаться" }).click();
  await client.page.getByRole("checkbox", { name: new RegExp(renamed) }).click();
  await client.page.getByRole("button", { name: "Продолжить", exact: true }).click();
  const saturdayTab = client.page.getByRole("tab", { name: /Сб/ }).last();
  await expect(saturdayTab).toBeVisible();
  await saturdayTab.click();
  await expect(client.page.locator(".ms-client-slot", { hasText: "10:00" })).toBeVisible();
  await expect(client.page.locator(".ms-client-slot", { hasText: "17:00" })).toHaveCount(0);

  await master.close();
  await client.close();
});

test("a flagged test user can restart onboarding", async ({ page }) => {
  const closed = await page.request.post("/api/auth/dev", {
    data: { userId: 1 },
  });
  expect(closed.status()).toBe(404);

  const id = uniqueUserId();
  const plain = await login(page, { id, firstName: "Тест Мастер" });
  await page.goto("/cabinet/profile");
  await expect(page.getByRole("button", { name: "Сбросить онбординг" })).toHaveCount(0);
  const denied = await page.request.post("/api/me/reset", {
    headers: { Authorization: `Bearer ${plain.token}` },
  });
  expect(denied.status()).toBe(403);

  await login(page, { id, firstName: "Тест Мастер", isTest: true });
  await page.getByRole("button", { name: "Создать страницу мастера" }).click();
  await page.getByPlaceholder("Анна").fill("Чужое имя");
  await page.getByRole("radio", { name: "Маникюр", exact: true }).click();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(page.getByRole("button", { name: "Добавить первую услугу" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Сбросить онбординг" })).toHaveCount(0);

  await page.goto("/cabinet/profile");
  const about = page.getByRole("button", { name: "О приложении" });
  const reset = page.getByRole("button", { name: "Сбросить онбординг" });
  await expect(about).toBeVisible();
  await expect(reset).toBeVisible();
  const aboutBox = await about.boundingBox();
  const resetBox = await reset.boundingBox();
  expect(aboutBox && resetBox && resetBox.y > aboutBox.y + aboutBox.height).toBeTruthy();

  page.once("dialog", (dialog) => dialog.accept());
  await reset.click();
  await page.getByRole("button", { name: "Создать страницу мастера" }).click();
  await expect(page.getByText("Шаг 1 из 4")).toBeVisible();
  await expect(page.getByPlaceholder("Анна")).toHaveValue("Тест Мастер");
});
