/**
 * Working-time sheet helpers. Run: npx tsx src/lib/timeSheet.test.ts
 */
import { minutesToTime } from "./masterDraft.ts";
import { isTimeAllowed, quickTimeChoices } from "./timeSheet.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function same(actual: string[], expected: string[], msg: string): void {
  const left = actual.join(",");
  const right = expected.join(",");
  assert(left === right, `${msg}: ${left} != ${right}`);
}

assert(isTimeAllowed("10:00", "start", "18:00"), "start before end");
assert(!isTimeAllowed("18:00", "start", "18:00"), "start equal to end");
assert(!isTimeAllowed("19:00", "start", "18:00"), "start after end");
assert(isTimeAllowed("18:30", "end", "10:00"), "end after start");
assert(!isTimeAllowed("10:00", "end", "10:00"), "end equal to start");
assert(!isTimeAllowed("09:30", "end", "10:00"), "end before start");

const customStart = minutesToTime(9 * 60 + 15);
assert(customStart === "09:15", "custom 09:15");
assert(isTimeAllowed(customStart, "start", "18:00"), "custom start allowed");
assert(!isTimeAllowed("18:15", "end", "18:30"), "custom end still too early");
assert(isTimeAllowed("18:45", "end", "18:30"), "custom end after start");

const midday = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
same(quickTimeChoices("10:00", "start", "18:00"), midday, "midday window");

for (const picked of midday) {
  same(
    quickTimeChoices("10:00", "start", "18:00"),
    midday,
    `window stays on opened time after picking ${picked}`,
  );
}

same(
  quickTimeChoices("11:30", "start", "18:00"),
  ["10:30", "11:00", "11:30", "12:00", "12:30", "13:00"],
  "rebuilding from a picked chip slides the window",
);

same(
  quickTimeChoices("06:00", "start", "18:00"),
  ["06:00", "06:30", "07:00", "07:30", "08:00", "08:30"],
  "morning window clamps to 06:00",
);

same(
  quickTimeChoices("23:00", "end", "10:00"),
  ["21:00", "21:30", "22:00", "22:30", "23:00", "23:30"],
  "evening window clamps to 23:30",
);

same(quickTimeChoices("06:00", "start", "06:30"), ["06:00"], "single legal slot");
same(quickTimeChoices("23:30", "end", "23:30"), [], "no later slot");

same(
  quickTimeChoices("10:15", "start", "18:00"),
  midday,
  "off-grid center snaps to nearest half hours",
);

same(
  quickTimeChoices("10:00", "end", "10:00"),
  ["10:30", "11:00", "11:30", "12:00", "12:30", "13:00"],
  "end excludes the start and earlier chips",
);

console.log("timeSheet.test.ts: ok");
