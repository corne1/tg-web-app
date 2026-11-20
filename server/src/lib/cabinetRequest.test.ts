/**
 * Cabinet route bodies. Run: npx tsx src/lib/cabinetRequest.test.ts
 */
import {
  readCabinetBookingBody,
  readCabinetClientBody,
  readNoteBody,
} from "./cabinetRequest.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const client = readCabinetClientBody({ name: "  Анна ", phone: " 1 " });
assert(client.ok && client.value.name === "Анна" && client.value.phone === "1", "client");
assert(!readCabinetClientBody({ name: "  " }).ok, "client name");

const note = readNoteBody({ title: "", body: " текст " });
assert(note.ok && note.value.title === "Заметка" && note.value.body === "текст", "note default title");
assert(!readNoteBody({ body: "  " }).ok, "note body");

const booking = readCabinetBookingBody({
  masterClientId: "c1",
  dateISO: "2026-11-20",
  time: "9:05",
  serviceIds: [1, "a"],
});
assert(
  booking.ok &&
    booking.value.hour === 9 &&
    booking.value.minute === 5 &&
    booking.value.serviceIds.join(",") === "1,a",
  "booking",
);
assert(!readCabinetBookingBody({ masterClientId: "c1", dateISO: "20-11", time: "09:00" }).ok, "date");
assert(!readCabinetBookingBody({ masterClientId: "c1", dateISO: "2026-11-20", time: "25:00" }).ok, "time");

console.log("cabinetRequest.test.ts: ok");
