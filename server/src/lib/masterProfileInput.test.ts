/**
 * Master profile body. Run: npx tsx src/lib/masterProfileInput.test.ts
 */
import { readMasterProfileBody } from "./masterProfileInput.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const ok = readMasterProfileBody({
  name: "  Анна ",
  serviceTypeCode: "nails",
  aboutText: "текст",
});
assert(ok.ok && ok.value.name === "Анна", "trims name");
assert(ok.ok && ok.value.city === "Москва", "default city");
assert(ok.ok && ok.value.aboutText === "текст", "aboutText");

const about = readMasterProfileBody({
  name: "Анна",
  serviceTypeCode: "nails",
  about: "из about",
});
assert(about.ok && about.value.aboutText === "из about", "about alias");

assert(!readMasterProfileBody({ name: "", serviceTypeCode: "nails" }).ok, "empty name");
assert(
  !readMasterProfileBody({ name: "Анна", serviceTypeCode: "" }).ok,
  "empty type",
);

console.log("masterProfileInput.test.ts: ok");
