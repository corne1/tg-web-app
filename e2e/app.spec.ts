import { expect, test } from "@playwright/test";
import { login, openUser, uniqueUserId } from "./auth.ts";
import {
  bookClientSlot,
  pickMasterSlot,
  publishMaster,
  reachPublishReview,
  showScheduleCard,
} from "./flows.ts";

test("rejects e2e login without the secret", async ({ request }) => {
  const res = await request.post("/api/auth/e2e", {
    data: { userId: uniqueUserId(), firstName: "Чужой" },
  });
  expect(res.status()).toBe(401);
});

test("master publishes a page clients can open", async ({ page }) => {
  const masterId = uniqueUserId();
  const name = "Анна Е2Е";
  const service = `Маникюр ${masterId}`;
  const address = `Тверская ${masterId}`;
  const session = await login(page, { id: masterId, firstName: name });

  await publishMaster(page, { name, service, address });
  await page.getByRole("button", { name: /Посмотреть как клиент/ }).click();
  await expect(page).toHaveURL(new RegExp(`/client/${session.slug ?? `m${masterId}`}`));
  await expect(page.getByText(service)).toBeVisible();
  await expect(page.getByText(`Москва, ${address}`)).toBeVisible();
  await expect(page.getByText("Кнопка демонстрационная, неактивна")).toBeVisible();
});

test("schedule calendar sheet picks a date", async ({ page }) => {
  const masterId = uniqueUserId();
  await login(page, { id: masterId, firstName: "Мастер Даты" });
  await publishMaster(page, {
    name: "Мастер Даты",
    service: `Маникюр ${masterId}`,
    address: `Тверская ${masterId}`,
  });
  await page.getByRole("button", { name: "Перейти в расписание" }).click();
  await expect(page.getByRole("heading", { name: "Расписание", exact: true })).toBeVisible();

  const target = new Date();
  target.setDate(15);
  const monthGen = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ][target.getMonth()];
  const weekday = [
    "Воскресенье",
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
  ][target.getDay()];
  const dayLabel = `${target.getDate()} ${monthGen}`;

  await page.getByRole("button", { name: "Выбрать дату" }).click();
  await expect(page.getByRole("heading", { name: "Выберите дату" })).toBeVisible();
  await expect(page.getByText("Есть записи")).toBeVisible();
  await page.getByRole("gridcell", { name: dayLabel }).click();
  await page.screenshot({ path: "test-results/schedule-date-sheet.png" });
  await page.getByRole("button", { name: "Готово" }).click();
  await expect(page.getByRole("heading", { name: "Выберите дату" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: `${weekday}, ${dayLabel}` }),
  ).toBeVisible();
});

test("publish review edits return to the checklist", async ({ page }) => {
  const masterId = uniqueUserId();
  const service = `Маникюр ${masterId}`;
  await login(page, { id: masterId, firstName: "Мастер Правки" });
  await reachPublishReview(page, {
    name: "Мастер Правки",
    service,
    address: `Тверская ${masterId}`,
  });

  const review = page.getByRole("heading", { name: "Проверьте профиль" });
  const publish = page.getByRole("button", { name: "Опубликовать профиль" });
  const edits = page.getByRole("button", { name: "Редактировать", exact: true });

  await edits.nth(2).click();
  await expect(
    page.getByRole("heading", { name: "Когда вы принимаете клиентов?" }),
  ).toBeVisible();
  await page.goBack();
  await expect(review).toBeVisible();
  await expect(publish).toBeVisible();
  await expect(page.getByText("Этап 1")).toHaveCount(0);

  await edits.nth(0).click();
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(review).toBeVisible();
  await expect(publish).toBeVisible();

  await edits.nth(1).click();
  await page.getByRole("button", { name: "Действия" }).click();
  await page.getByRole("menuitem", { name: "Редактировать" }).click();
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(page.getByRole("listitem").getByText(service)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Когда вы принимаете клиентов?" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(review).toBeVisible();
  await expect(publish).toBeVisible();

  await edits.nth(2).click();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(review).toBeVisible();
  await expect(publish).toBeVisible();
  await expect(page.getByText("Этап 1")).toHaveCount(0);

  await edits.nth(3).click();
  await expect(page.getByText("Этап 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Сохранить и выйти" })).toHaveCount(0);
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(review).toBeVisible();
  await expect(publish).toBeVisible();
});

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
  await page.getByRole("button", { name: "Сохранить клиента" }).click();
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
