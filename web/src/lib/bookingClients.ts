export type ClientNote = {
  id: string;
  title: string;
  body: string;
  addedLabel: string;
};

export type ClientNextBooking = {
  dateLabel: string;
  time: string;
  serviceTitle: string;
  priceLabel: string;
  bookingId?: string;
};

export type ClientVisitHistoryItem = {
  id: string;
  dateLabel: string;
  serviceTitle: string;
  priceLabel: string;
  statusLabel: string;
};

export type BookingClient = {
  id: string;
  name: string;
  phone: string;
  visits: number;
  lastVisitLabel: string | null;
  /** ISO date for sorting «Последние клиенты». */
  lastVisitAt: string | null;
  avatarTone: "violet" | "sky" | "mint" | "amber";
  notes: ClientNote[];
  /** Cabinet client card (Figma 21317:15642). */
  clientSinceLabel?: string | null;
  nextBooking?: ClientNextBooking | null;
  history?: ClientVisitHistoryItem[];
};

export function clientInitial(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return (part?.[0] ?? "?").toUpperCase();
}

export function pluralVisits(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "визит";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "визита";
  return "визитов";
}

export function pluralClients(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "клиент";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "клиента";
  return "клиентов";
}

export function clientVisitsLabel(client: BookingClient): string {
  if (client.visits <= 0) return "Новый клиент";
  const last = client.lastVisitLabel
    ? ` · последний ${client.lastVisitLabel}`
    : "";
  return `${client.visits} ${pluralVisits(client.visits)}${last}`;
}

/** Primary subtitle under name in clients list (Figma 21317:15642). */
export function clientListMeta(client: BookingClient): string {
  if (client.nextBooking) {
    return `Записана на ${client.nextBooking.dateLabel}`;
  }
  if (client.visits <= 0) return "Новый клиент";
  if (client.lastVisitLabel) return `Последний визит ${client.lastVisitLabel}`;
  return `${client.visits} ${pluralVisits(client.visits)}`;
}

export function filterBookingClients(
  clients: BookingClient[],
  query: string,
): BookingClient[] {
  const q = query.trim().toLowerCase();
  if (!q) return clients;
  const digits = q.replace(/\D/g, "");
  return clients.filter((c) => {
    if (c.name.toLowerCase().includes(q)) return true;
    if (digits && c.phone.replace(/\D/g, "").includes(digits)) return true;
    return false;
  });
}

export function sortClientsRecent(clients: BookingClient[]): BookingClient[] {
  return [...clients].sort((a, b) => {
    const ta = a.lastVisitAt ? Date.parse(a.lastVisitAt) : 0;
    const tb = b.lastVisitAt ? Date.parse(b.lastVisitAt) : 0;
    return tb - ta;
  });
}

export {
  emptyBookingDraft,
  patchBookingDraft,
  readBookingDraft,
  writeBookingDraft,
  type BookingDraft,
} from "./bookingDraft";
