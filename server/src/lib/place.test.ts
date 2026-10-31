/**
 * Place helpers. Run: npx tsx src/lib/place.test.ts
 */
import {
  isMasterPlaceValid,
  normalizeMasterPlace,
  primaryCityFromPlace,
} from "./place.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const studio = normalizeMasterPlace({
  mode: "studio",
  studio: {
    city: " Москва ",
    address: " Тверская 1 ",
    comment: "эт. 3",
    addressVisibility: "after_booking",
  },
  visit: { city: "", areas: "" },
});

assert(studio != null, "normalize studio");
assert(studio!.studio.city === "Москва", "trim city");
assert(studio!.studio.addressVisibility === "after_booking", "visibility");
assert(isMasterPlaceValid(studio!) === true, "studio valid");
assert(primaryCityFromPlace(studio!) === "Москва", "primary city");

const invalid = normalizeMasterPlace({
  mode: "studio",
  studio: { city: "Москва", address: "", comment: "", addressVisibility: "public" },
  visit: { city: "", areas: "" },
});
assert(invalid != null && isMasterPlaceValid(invalid) === false, "needs address");

const fromDraftShape = normalizeMasterPlace({
  placeMode: "visit",
  visitPlace: { city: "Казань", comment: "Вахитовский" },
  studioPlace: { city: "", address: "", comment: "" },
});
assert(fromDraftShape?.mode === "visit", "draft shape mode");
assert(fromDraftShape?.visit.areas === "Вахитовский", "comment→areas");
assert(isMasterPlaceValid(fromDraftShape!) === true, "visit valid");

console.log("place.test.ts: ok");
