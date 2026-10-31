/**
 * Place step flow helpers. Run: npx tsx src/lib/placeStepFlow.test.ts
 */
import {
  canContinuePlaceStage1,
  canContinuePlaceStage2,
  draftToPlaceDto,
  placeStage2Copy,
} from "./placeStepFlow.ts";
import type { MasterDraft, PlaceDetails } from "./masterDraft.ts";

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

console.log("placeStepFlow.test.ts: ok");
