/**
 * Pure client helpers. Run: npx tsx src/db/clients.pure.test.ts
 */
import { avatarToneFromId } from "./clients.js";
import { bookingServiceTitles } from "./bookingRows.js";
import type { BookingRow } from "./types.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(avatarToneFromId("a") === avatarToneFromId("a"), "tone is stable");
assert(
  ["violet", "sky", "mint", "amber"].includes(avatarToneFromId("client-1")),
  "tone is one of the four",
);

const titles = bookingServiceTitles({
  services: [{ title: "Маникюр" }, { title: "" }, { title: "Педикюр" }],
} as BookingRow);
assert(titles.join(",") === "Маникюр,Педикюр", "blank titles dropped");

console.log("clients.pure.test.ts: ok");
