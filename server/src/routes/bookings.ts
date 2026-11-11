import { Router } from "express";
import {
  BookingConflictError,
  BookingRuleError,
  cancelBooking,
  createBooking,
  ensureBookingAccessToken,
  getBooking,
  getBookingByAccessToken,
  listClientBookings,
  markPaid,
  rescheduleBooking,
} from "../db/bookings.js";
import { ensureClientFromBooking } from "../db/clients.js";
import { getProfile } from "../db/profiles.js";
import { listServices } from "../db/services.js";
import type { MasterServiceRow } from "../db/types.js";
import { upsertUser } from "../db/users.js";
import { requireSession, type AuthedRequest } from "../middleware.js";
import {
  notifyBookingCancelled,
  notifyBookingCreated,
} from "../services/notify.js";
import { serializeClientBooking } from "../lib/clientBookingView.js";
import { generateSlots } from "../services/slots.js";
import { formatDateLabel, formatTime } from "../services/time.js";

export const bookingsRouter = Router();

bookingsRouter.post("/", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const body = req.body ?? {};
  const masterId = Number(body.masterId);
  const startsAt = String(body.startsAt ?? "");
  const serviceIds: string[] = Array.isArray(body.serviceIds)
    ? body.serviceIds
        .map((id: unknown) => String(id))
        .filter((id: string) => id.length > 0)
    : [];
  const placeChoice =
    body.placeChoice === "studio" || body.placeChoice === "visit"
      ? body.placeChoice
      : null;
  const visitAddress = {
    city: String(body.visitCity ?? "").trim(),
    area: String(body.visitArea ?? "").trim(),
    address: String(body.visitAddress ?? "").trim(),
    apt: String(body.visitApt ?? "").trim(),
    entrance: String(body.visitEntrance ?? "").trim(),
    floor: String(body.visitFloor ?? "").trim(),
    intercom: String(body.visitIntercom ?? "").trim(),
    note: String(body.visitNote ?? "").trim(),
  };
  const comment = String(body.comment ?? "").trim();
  const nameOverride = String(body.clientName ?? "").trim();

  if (!Number.isFinite(masterId) || !startsAt) {
    res.status(400).json({ error: "masterId and startsAt required" });
    return;
  }
  if (masterId === tg.id) {
    res.status(400).json({ error: "Cannot book yourself" });
    return;
  }

  const profile = await getProfile(masterId);
  if (!profile || profile.status !== "active") {
    res.status(404).json({ error: "Master not found" });
    return;
  }

  const catalog = await listServices(masterId);
  if (catalog.length === 0) {
    res.status(400).json({ error: "Master has no services" });
    return;
  }

  const selected: MasterServiceRow[] = [];
  if (serviceIds.length > 0) {
    for (const id of serviceIds) {
      const svc = catalog.find((row) => row.id === id);
      if (svc) selected.push(svc);
    }
  } else {
    selected.push(catalog[0]!);
  }

  if (selected.length === 0) {
    res.status(400).json({ error: "At least one valid service required" });
    return;
  }

  const titles = selected.map((row) => row.title);
  let durationMin = 0;
  let price = 0;
  let anyFrom = false;
  for (const row of selected) {
    durationMin += row.duration_min + (row.break_after_min || 0);
    price += row.price;
    if (row.price_mode === "from") anyFrom = true;
  }
  const serviceInputs = selected.map((row) => ({
    serviceId: row.id,
    title: row.title,
    durationMin: row.duration_min,
    breakAfterMin: row.break_after_min || 0,
    price: row.price,
    priceMode: row.price_mode,
  }));

  const place = profile.place;
  let resolvedPlace: "studio" | "visit" | null = placeChoice;
  if (!resolvedPlace && place) {
    if (place.mode === "studio") resolvedPlace = "studio";
    else if (place.mode === "visit") resolvedPlace = "visit";
  }
  if (resolvedPlace === "visit") {
    if (!visitAddress.city || !visitAddress.address) {
      res.status(400).json({ error: "Visit address required" });
      return;
    }
  }

  const travelBufferMin =
    resolvedPlace === "visit" ? (profile.travel_buffer_min ?? 30) : undefined;
  const slots = await generateSlots(profile, 14, {
    durationMin,
    travelBufferMin,
  });
  const slot = slots.find((s) => s.startsAt === startsAt && s.available);
  if (!slot) {
    res.status(409).json({ error: "Slot unavailable" });
    return;
  }

  const clientName =
    nameOverride ||
    [tg.first_name, tg.last_name].filter(Boolean).join(" ") ||
    "Клиент";

  try {
    await upsertUser(tg);
    const masterClient = await ensureClientFromBooking({
      masterId,
      telegramUserId: tg.id,
      name: clientName,
    });
    const studioAddress =
      resolvedPlace === "studio" && place?.studio
        ? [place.studio.city, place.studio.address].filter(Boolean).join(", ")
        : null;
    const visitLine =
      resolvedPlace === "visit"
        ? [visitAddress.city, visitAddress.area, visitAddress.address]
            .filter(Boolean)
            .join(", ")
        : null;
    const placeAddress = studioAddress ?? visitLine;

    const booking = await createBooking({
      masterId,
      clientId: tg.id,
      clientName,
      startsAt,
      durationMin,
      price,
      priceFrom: anyFrom,
      services: serviceInputs,
      masterClientId: masterClient.id,
      placeChoice: resolvedPlace,
      placeAddress,
      clientComment: comment || null,
      visitJson: resolvedPlace === "visit" ? visitAddress : null,
    });

    void notifyBookingCreated({
      booking,
      masterName: profile.name,
      masterTimezone: profile.timezone,
    });

    const view = serializeClientBooking(booking, profile);
    res.status(201).json({
      booking: {
        ...view,
        serviceTitles: titles,
      },
    });
  } catch (err) {
    if (err instanceof BookingConflictError) {
      res.status(409).json({ error: err.message });
      return;
    }
    console.error("[bookings.create]", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

bookingsRouter.get("/mine", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const rows = await listClientBookings(tg.id);
  const enriched = await Promise.all(
    rows.map(async (b) => {
      const withToken = await ensureBookingAccessToken(b);
      const profile = await getProfile(withToken.master_id);
      return serializeClientBooking(withToken, profile);
    }),
  );
  res.json({ bookings: enriched });
});

/** Opaque token deep-link: /api/bookings/t/:token */
bookingsRouter.get(
  "/t/:token",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    const token = String(req.params.token ?? "");
    let booking = await getBookingByAccessToken(token);
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    // First open by the booker binds session; master can also open.
    if (booking.client_id !== tg.id && booking.master_id !== tg.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    booking = await ensureBookingAccessToken(booking);
    const profile = await getProfile(booking.master_id);
    res.json({ booking: serializeClientBooking(booking, profile) });
  },
);

bookingsRouter.get("/:id", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const id = String(req.params.id);
  let booking = await getBooking(id);
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (booking.client_id !== tg.id && booking.master_id !== tg.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  booking = await ensureBookingAccessToken(booking);
  const profile = await getProfile(booking.master_id);
  res.json({ booking: serializeClientBooking(booking, profile) });
});

bookingsRouter.post(
  "/:id/cancel",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    const id = String(req.params.id);
    const existing = await getBooking(id);
    if (!existing) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const profile = await getProfile(existing.master_id);
    const cancelHours =
      existing.master_id === tg.id ? 0 : (profile?.cancel_hours ?? 24);

    try {
      const booking = await cancelBooking(id, tg.id, cancelHours);
      if (profile) {
        void notifyBookingCancelled({
          booking,
          masterName: profile.name,
          masterTimezone: profile.timezone,
          by: existing.client_id === tg.id ? "client" : "master",
        });
      }
      res.json({ ok: true, booking: { id: booking.id, status: booking.status } });
    } catch (err) {
      if (err instanceof BookingRuleError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error("[bookings.cancel]", err);
      res.status(500).json({ error: "Failed to cancel" });
    }
  },
);

bookingsRouter.post(
  "/:id/reschedule",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    const id = String(req.params.id);
    const startsAt = String(req.body?.startsAt ?? "");
    if (!startsAt) {
      res.status(400).json({ error: "startsAt required" });
      return;
    }

    const existing = await getBooking(id);
    if (!existing) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const profile = await getProfile(existing.master_id);
    if (!profile) {
      res.status(404).json({ error: "Master not found" });
      return;
    }

    const slots = await generateSlots(
      profile,
      14,
      existing.duration_min || undefined,
    );
    const slot = slots.find((s) => s.startsAt === startsAt && s.available);
    if (!slot && startsAt !== existing.starts_at) {
      res.status(409).json({ error: "Slot unavailable" });
      return;
    }

    try {
      const booking = await rescheduleBooking(
        id,
        tg.id,
        startsAt,
        profile.cancel_hours,
      );
      res.json({
        booking: {
          id: booking.id,
          startsAt: booking.starts_at,
          time: formatTime(booking.starts_at, profile.timezone),
          date: formatDateLabel(booking.starts_at, profile.timezone),
          status: booking.status,
        },
      });
    } catch (err) {
      if (err instanceof BookingConflictError || err instanceof BookingRuleError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error("[bookings.reschedule]", err);
      res.status(500).json({ error: "Failed to reschedule" });
    }
  },
);

bookingsRouter.post(
  "/:id/paid",
  requireSession,
  async (req: AuthedRequest, res) => {
    const tg = req.telegramUser!;
    try {
      const booking = await markPaid(String(req.params.id), tg.id);
      res.json({
        booking: {
          id: booking.id,
          status: booking.status,
          paid: booking.paid,
        },
      });
    } catch (err) {
      if (err instanceof BookingRuleError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error("[bookings.paid]", err);
      res.status(500).json({ error: "Failed to mark paid" });
    }
  },
);
