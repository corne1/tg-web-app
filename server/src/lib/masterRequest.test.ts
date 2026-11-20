/**
 * Master route bodies. Run: npx tsx src/lib/masterRequest.test.ts
 */
import {
  readAvatarUrl,
  readBookingRulesBody,
  readHoursBody,
  readOnboardingStep,
  readServiceBody,
  readTravelBufferMin,
} from "./masterRequest.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(readAvatarUrl({ avatarUrl: "  https://cdn/a " }) === "https://cdn/a", "avatar trim");
assert(readAvatarUrl({ avatarUrl: null }) === null, "avatar null");
assert(readAvatarUrl({}) === null, "avatar missing");

const travel = readTravelBufferMin({ travelBufferMin: 30 });
assert(travel.ok && travel.value === 30, "travel ok");
assert(!readTravelBufferMin({ travelBufferMin: 300 }).ok, "travel too big");
const emptyTravel = readTravelBufferMin({});
assert(emptyTravel.ok && emptyTravel.value === undefined, "travel empty");

const hours = readHoursBody({
  hours: { mon: { enabled: true, start: "10:00", end: "18:00" } },
  dayBreakMin: 15,
});
assert(hours.ok && hours.value.dayBreakMin === 15, "hours ok");
assert(!readHoursBody({ hours: {} }).ok, "hours without a day");
assert(!readHoursBody({ hours: { mon: { enabled: true, start: "10:00", end: "18:00" } }, dayBreakMin: 999 }).ok, "break too big");

const rules = readBookingRulesBody({ cancelHours: 24, clientCancelEnabled: false });
assert(rules.ok && rules.value.cancelHours === 24, "rules ok");
assert(!readBookingRulesBody({ cancelHours: 3 }).ok, "rules reject unknown hour");

const service = readServiceBody({
  title: " Маникюр ",
  durationMin: 60,
  price: 2500,
  priceMode: "from",
});
assert(service.ok && service.value.title === "Маникюр" && service.value.priceMode === "from", "service");
assert(!readServiceBody({ title: "", durationMin: 60, price: 1 }).ok, "service title");

const step = readOnboardingStep({ step: 3 });
assert(step.ok && step.value === 3, "step");
assert(!readOnboardingStep({ step: 0 }).ok, "step range");

console.log("masterRequest.test.ts: ok");
