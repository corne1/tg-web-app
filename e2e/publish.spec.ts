import { expect, test } from "@playwright/test";
import { login, openUser, uniqueUserId } from "./auth.ts";
import {
  bookClientSlot,
  pickMasterSlot,
  publishMaster,
  reachPublishReview,
  showScheduleCard,
} from "./flows.ts";

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

test("time sheet shows both quick-choice rows", async ({ page }) => {
  const masterId = uniqueUserId();
  await login(page, { id: masterId, firstName: "Мастер Часы" });
  await page.getByRole("button", { name: "Создать страницу мастера" }).click();
  await page.getByPlaceholder("Анна").fill("Мастер Часы");
  await page.getByRole("radio", { name: "Маникюр", exact: true }).click();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByRole("button", { name: "Добавить первую услугу" }).click();
  await page.getByPlaceholder("Маникюр с покрытием").fill("Маникюр");
  await page.getByPlaceholder("2500").first().fill("2500");
  await page.getByRole("button", { name: "Создать услугу" }).click();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Когда вы принимаете клиентов?" }),
  ).toBeVisible();

  const sheets = [
    ["10:00", "Начало рабочего дня"],
    ["18:00", "Окончание рабочего дня"],
  ] as const;

  for (const height of [874, 520]) {
    await page.setViewportSize({ width: 402, height });
    for (const [time, heading] of sheets) {
      await page.getByRole("button", { name: time, exact: true }).first().click();
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await page.evaluate(() =>
        Promise.all(
          document.getAnimations().map((a) => a.finished.catch(() => undefined)),
        ),
      );
      const report = await page.evaluate((viewport) => {
        const root = document.querySelector(".ms-sheet-root");
        const chips = [...document.querySelectorAll(".ms-time-sheet-chip")].map((el) => {
          const r = el.getBoundingClientRect();
          let visible = r.height;
          let node = el.parentElement;
          while (node && node !== document.documentElement) {
            const oy = getComputedStyle(node).overflowY;
            if (oy === "auto" || oy === "hidden" || oy === "scroll" || oy === "clip") {
              const b = node.getBoundingClientRect();
              visible = Math.min(
                visible,
                Math.max(0, Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top)),
              );
            }
            node = node.parentElement;
          }
          const inViewport = Math.max(
            0,
            Math.min(r.bottom, viewport) - Math.max(r.top, 0),
          );
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return {
            t: (el.textContent ?? "").trim(),
            h: r.height,
            visible,
            inViewport,
            hit: hit instanceof Element ? hit.className : "",
          };
        });
        return {
          parent: root?.parentElement?.tagName ?? "",
          insideSetupBody: Boolean(root?.closest(".ms-body")),
          opacity: root
            ? getComputedStyle(root.querySelector(".ms-sheet") as Element).opacity
            : "",
          chips,
        };
      }, height);
      expect(report.parent, heading).toBe("BODY");
      expect(report.insideSetupBody, heading).toBe(false);
      expect(report.opacity, heading).toBe("1");
      expect(report.chips, heading).toHaveLength(6);
      for (const chip of report.chips) {
        expect(chip.visible, `${heading} ${chip.t}`).toBeGreaterThan(chip.h - 1);
        expect(chip.inViewport, `${heading} ${chip.t}`).toBeGreaterThan(chip.h - 1);
        expect(chip.hit, `${heading} ${chip.t}`).toContain("ms-time-sheet-chip");
      }
      if (height === 874 && heading === "Окончание рабочего дня") {
        await page.screenshot({ path: "test-results/time-sheet-page.png" });
      }
      await page.getByRole("dialog").getByRole("button", { name: "Закрыть" }).click();
      await expect(page.getByRole("heading", { name: heading })).toBeHidden();
    }
  }
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
