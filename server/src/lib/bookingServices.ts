import type { MasterServiceRow } from "../db/types.js";

export type BookingServiceLineInput = {
  serviceId: string;
  title: string;
  durationMin: number;
  breakAfterMin: number;
  price: number;
  priceMode: "fixed" | "from";
};

export type BookingTotals = {
  durationMin: number;
  price: number;
  priceFrom: boolean;
  titles: string[];
  services: BookingServiceLineInput[];
};

/** Map catalog rows → booking lines + totals (duration includes break_after). */
export function buildBookingFromServices(
  rows: MasterServiceRow[],
): BookingTotals {
  const services: BookingServiceLineInput[] = rows.map((row) => ({
    serviceId: row.id,
    title: row.title,
    durationMin: row.duration_min,
    breakAfterMin: row.break_after_min || 0,
    price: row.price,
    priceMode: row.price_mode,
  }));

  let durationMin = 0;
  let price = 0;
  let priceFrom = false;
  for (const s of services) {
    durationMin += s.durationMin + s.breakAfterMin;
    price += s.price;
    if (s.priceMode === "from") priceFrom = true;
  }

  return {
    durationMin,
    price,
    priceFrom,
    titles: services.map((s) => s.title),
    services,
  };
}

/** Resolve ids against catalog; throws if any id missing. */
export function selectServicesByIds(
  catalog: MasterServiceRow[],
  serviceIds: string[],
): MasterServiceRow[] {
  if (serviceIds.length === 0) {
    throw new Error("At least one service required");
  }
  const byId = new Map(catalog.map((s) => [s.id, s]));
  const selected: MasterServiceRow[] = [];
  for (const id of serviceIds) {
    const row = byId.get(id);
    if (!row) {
      throw new Error(`Unknown or inactive service: ${id}`);
    }
    selected.push(row);
  }
  return selected;
}
