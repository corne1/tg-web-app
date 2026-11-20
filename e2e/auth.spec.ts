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
