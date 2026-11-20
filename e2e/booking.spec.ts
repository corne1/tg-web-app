import { expect, test } from "@playwright/test";
import { login, openUser, uniqueUserId } from "./auth.ts";
import {
  bookClientSlot,
  pickMasterSlot,
  publishMaster,
  reachPublishReview,
  showScheduleCard,
} from "./flows.ts";

test("master creates a booking and sees it on the schedule", async ({ page }) => {
  const masterId = uniqueUserId();
  const service = `Маникюр ${masterId}`;
  const clientName = "Ева Тест";
  await login(page, { id: masterId, firstName: "Мастер Записи" });
  await publishMaster(page, {
    name: "Мастер Записи",
    service,
    address: `Арбат ${masterId}`,
  });

  await page.getByRole("button", { name: "Перейти в расписание" }).click();
  await page.getByRole("button", { name: "Добавить запись" }).click();
  await page.getByRole("button", { name: /Добавить нового клиента/ }).click();
  await page.getByPlaceholder("Анна Смирнова").fill(clientName);
  await page.getByRole("button", { name: "Добавить клиента" }).click();
  await page.getByRole("checkbox", { name: new RegExp(service) }).click();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await pickMasterSlot(page);
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByRole("button", { name: "Создать запись" }).click();
  await expect(page.getByRole("heading", { name: "Расписание", exact: true })).toBeVisible();
  await showScheduleCard(page, clientName);
});

test("client booking takes the slot", async ({ browser }) => {
  const masterId = uniqueUserId();
  const clientId = uniqueUserId();
  const service = `Маникюр ${masterId}`;
  const master = await openUser(browser, { id: masterId, firstName: "Мастер Слота" });
  await publishMaster(master.page, {
    name: "Мастер Слота",
    service,
    address: `Пятницкая ${masterId}`,
  });
  const me = await master.page.request.get("/api/me", {
    headers: { Authorization: `Bearer ${master.token}` },
  });
  const slug = ((await me.json()) as { profile: { slug: string } }).profile.slug;

  const client = await openUser(
    browser,
    { id: clientId, firstName: "Клиент" },
    `/client/${slug}`,
  );
  const time = await bookClientSlot(client.page, {
    service,
    clientName: "Клиент Слота",
    day: "first",
  });

  await client.page.goto(`/client/${slug}`);
  await client.page.getByRole("button", { name: "Записаться" }).click();
  await client.page.getByRole("checkbox", { name: new RegExp(service) }).click();
  await client.page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(client.page.getByRole("tab").first()).toBeVisible();
  await client.page.getByRole("tab").first().click();
  await expect(client.page.locator(".ms-client-slot", { hasText: time })).toHaveCount(0);
  await master.close();
  await client.close();
});

test("cancel and reschedule follow the booking window", async ({ browser }) => {
  const masterId = uniqueUserId();
  const clientId = uniqueUserId();
  const service = `Маникюр ${masterId}`;
  const nearName = "Ближний Клиент";
  const farName = "Дальний Клиент";

  const master = await openUser(browser, { id: masterId, firstName: "Мастер Правил" });
  await publishMaster(master.page, {
    name: "Мастер Правил",
    service,
    address: `Садовая ${masterId}`,
  });
  await master.page.getByRole("button", { name: "Перейти в расписание" }).click();
  await master.page.getByRole("link", { name: "Профиль" }).click();
  await master.page.getByRole("button", { name: "Правила записи" }).click();
  await master.page.getByRole("button", { name: /Отменять не позднее/ }).click();
  await master.page.getByRole("radio", { name: "72 часа" }).check();
  await master.page.getByRole("button", { name: "Готово" }).click();
  await expect(master.page.getByText("Сохранено")).toBeVisible();
  await master.page.getByRole("button", { name: /Перенести не позднее/ }).click();
  await master.page.getByRole("radio", { name: "72 часа" }).check();
  await master.page.getByRole("button", { name: "Готово" }).click();
  await expect(master.page.getByText("72 часа").nth(1)).toBeVisible();

  const me = await master.page.request.get("/api/me", {
    headers: { Authorization: `Bearer ${master.token}` },
  });
  const slug = ((await me.json()) as { profile: { slug: string } }).profile.slug;
  const client = await openUser(
    browser,
    { id: clientId, firstName: "Клиент" },
    `/client/${slug}`,
  );

  await bookClientSlot(client.page, { service, clientName: nearName, day: "first" });
  await client.page.getByRole("button", { name: "Открыть мою запись" }).click();
  await expect(client.page.getByRole("button", { name: "Отменить запись" })).toHaveCount(0);
  await expect(client.page.getByRole("button", { name: "Перенести запись" })).toHaveCount(0);
  await expect(client.page.getByText(/Самостоятельная отмена недоступна/)).toBeVisible();
  await expect(client.page.getByText(/Самостоятельный перенос недоступен/)).toBeVisible();

  await client.page.goto(`/client/${slug}`);
  const farTime = await bookClientSlot(client.page, {
    service,
    clientName: farName,
    day: "last",
  });
  await client.page.getByRole("button", { name: "Открыть мою запись" }).click();
  await client.page.getByRole("button", { name: "Перенести запись" }).click();
  await expect(client.page.getByRole("heading", { name: "Когда вам удобно?" })).toBeVisible();
  await client.page.getByRole("tab").last().click();
  const slots = client.page.locator(".ms-client-slot");
  await expect(slots.first()).toBeVisible();
  const slotCount = await slots.count();
  let movedTo = "";
  for (let i = 0; i < slotCount; i++) {
    const label = (await slots.nth(i).innerText()).trim();
    if (label !== farTime) {
      movedTo = label;
      await slots.nth(i).click();
      break;
    }
  }
  expect(movedTo).not.toBe("");
  await client.page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await client.page.getByRole("button", { name: "Подтвердить перенос" }).click();
  await expect(client.page).toHaveURL(/\/client\/bookings\//);
  await expect(client.page.getByText(movedTo).first()).toBeVisible();

  await client.page.getByRole("button", { name: "Отменить запись" }).click();
  await client.page.getByRole("button", { name: "Да, отменить запись" }).click();
  await expect(client.page.getByText("Отменена")).toBeVisible();

  await showScheduleCard(master.page, nearName);
  await master.page.getByRole("button", { name: new RegExp(nearName) }).click();
  await master.page.getByRole("button", { name: "Ещё" }).click();
  await master.page.getByRole("button", { name: "Отменить запись" }).click();
  await expect(master.page.getByText("Причина отмены")).toBeVisible();

  await master.close();
  await client.close();
});
