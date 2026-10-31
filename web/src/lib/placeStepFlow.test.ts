/**
 * Place step flow helpers. Run: npx tsx src/lib/placeStepFlow.test.ts
 */
import {
  canContinuePlaceStage1,
  canContinuePlaceStage2,
  draftToPlaceDto,
  formatStudioAddressLine,
  placeStage2Copy,
  reviewAddressVisibilityNote,
  reviewDaysOffShort,
  reviewWorkingDayRows,
} from "./placeStepFlow.ts";
import {
  applyHoursPreset,
  type MasterDraft,
  type PlaceDetails,
} from "./masterDraft.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const empty = (): PlaceDetails => ({
  city: "",
  address: "",
  comment: "",
  addressVisibility: "public",
});

assert(canContinuePlaceStage1(null) === false, "stage1 empty");
assert(canContinuePlaceStage1("studio") === true, "stage1 studio");

assert(
  canContinuePlaceStage2("studio", empty(), empty()) === false,
  "studio needs city+address",
);
assert(
  canContinuePlaceStage2(
    "studio",
    { ...empty(), city: "Москва", address: "Тверская 1" },
    empty(),
  ) === true,
  "studio valid",
);
assert(
  canContinuePlaceStage2(
    "visit",
    empty(),
    { ...empty(), city: "Москва" },
  ) === true,
  "visit city only",
);
assert(
  canContinuePlaceStage2(
    "both",
    { ...empty(), city: "Москва", address: "А" },
    { ...empty(), city: "Казань" },
  ) === true,
  "both valid",
);

assert(
  placeStage2Copy("visit").title.includes("районах"),
  "visit title",
);
assert(
  placeStage2Copy("both").title.includes("выезжаете"),
  "both title",
);
assert(
  placeStage2Copy("studio").lead.includes("адрес"),
  "studio lead",
);

const draft = {
  placeMode: "studio",
  studioPlace: {
    city: "Москва",
    address: "ул. А, 1",
    comment: "эт. 2",
    addressVisibility: "after_booking",
  },
  visitPlace: empty(),
} as MasterDraft;

const dto = draftToPlaceDto(draft);
assert(dto?.mode === "studio", "dto mode");
assert(dto?.studio.addressVisibility === "after_booking", "dto visibility");
assert(dto?.visit.areas === "", "dto visit areas");

const monFri = applyHoursPreset("mon-fri");
const workRows = reviewWorkingDayRows(monFri);
assert(workRows.length === 5, "mon-fri work days");
assert(workRows[0].label === "Понедельник", "first work label");
assert(workRows[0].range === "10:00–19:00", "work range");
assert(reviewDaysOffShort(monFri) === "Сб, Вс", "days off short");
assert(
  reviewAddressVisibilityNote("after_booking").includes("после подтверждения"),
  "visibility after booking",
);
assert(
  reviewAddressVisibilityNote("public").includes("публичном"),
  "visibility public",
);
assert(
  formatStudioAddressLine({
    city: "Москва",
    address: "Тверская улица, 12",
    comment: "",
    addressVisibility: "public",
  }) === "Москва, Тверская улица, 12",
  "studio address line",
);

console.log("placeStepFlow.test.ts: ok");
