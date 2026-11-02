export type ClientNote = {
  id: string;
  title: string;
  body: string;
  addedLabel: string;
};

export type BookingClient = {
  id: string;
  name: string;
  phone: string;
  visits: number;
  lastVisitLabel: string | null;
  /** ISO date for sorting «Последние клиенты». */
  lastVisitAt: string | null;
  notes: ClientNote[];
};

/** Demo clients matching Figma 21213:141883 until cabinet clients API exists. */
export const BOOKING_CLIENTS_DEMO: BookingClient[] = [
  {
    id: "c-anna",
    name: "Анна Смирнова",
    phone: "+7 999 ••• 12 34",
    visits: 5,
    lastVisitLabel: "24 окт",
    lastVisitAt: "2026-10-24",
    notes: [],
  },
  {
    id: "c-maria",
    name: "Мария Иванова",
    phone: "+7 999 ••• 45 67",
    visits: 3,
    lastVisitLabel: "18 окт",
    lastVisitAt: "2026-10-18",
    notes: [
      {
        id: "n1",
        title: "Не забыть",
        body: "Перед окрашиванием провести тест-пробу. Кожа головы чувствительная — используем щадящий состав.",
        addedLabel: "Добавлена после визита • 12 октября 2026",
      },
      {
        id: "n2",
        title: "Не забыть",
        body: "Еще какая-нибудь заметка для примера.",
        addedLabel: "Добавлена после визита • 1 октября 2026",
      },
    ],
  },
  {
    id: "c-elena",
    name: "Елена Петрова",
    phone: "+7 903 ••• 88 21",
    visits: 1,
    lastVisitLabel: "2 окт",
    lastVisitAt: "2026-10-02",
    notes: [],
  },
  {
    id: "c-katya",
    name: "Екатерина Волкова",
    phone: "+7 926 ••• 01 15",
    visits: 0,
    lastVisitLabel: null,
    lastVisitAt: null,
    notes: [],
  },
];

export function clientInitial(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return (part?.[0] ?? "?").toUpperCase();
}

export function clientVisitsLabel(client: BookingClient): string {
  if (client.visits <= 0) return "Новый клиент";
  const last = client.lastVisitLabel
    ? ` • последний ${client.lastVisitLabel}`
    : "";
  return `${client.visits} ${pluralVisits(client.visits)}${last}`;
}

function pluralVisits(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "визит";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "визита";
  return "визитов";
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

const DRAFT_KEY = "pomni.bookingDraft.v1";

export type BookingDraft = {
  clientId: string | null;
};

export function readBookingDraft(): BookingDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { clientId: null };
    const parsed = JSON.parse(raw) as BookingDraft;
    return { clientId: parsed.clientId ?? null };
  } catch {
    return { clientId: null };
  }
}

export function writeBookingDraft(draft: BookingDraft): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}
