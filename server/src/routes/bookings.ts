import { Router } from "express";
import {
  BookingConflictError,
  BookingRuleError,
  cancelBooking,
  createBooking,
  getBooking,
  listClientBookings,
  markPaid,
  rescheduleBooking,
} from "../db/bookings.js";
import { getProfile } from "../db/profiles.js";
import { upsertUser } from "../db/users.js";
import { requireSession, type AuthedRequest } from "../middleware.js";
import {
  notifyBookingCancelled,
  notifyBookingCreated,
} from "../services/notify.js";
import { generateSlots } from "../services/slots.js";
import { formatDateLabel, formatTime } from "../services/time.js";

export const bookingsRouter = Router();

bookingsRouter.post("/", requireSession, async (req: AuthedRequest, res) => {
  const tg = req.telegramUser!;
  const body = req.body ?? {};
  const masterId = Number(body.masterId);
  const startsAt = String(body.startsAt ?? "");

  if (!Number.isFinite(masterId) || !startsAt) {
    res.status(400).json({ error: "masterId and startsAt required" });
    return;
  }
  if (masterId === tg.id) {
    res.status(400).json({ error: "Cannot book yourself" });
    return;
  }

  const profile = await getProfile(masterId);
  if (!profile) {
    res.status(404).json({ error: "Master not found" });
    return;
  }

  const slots = await generateSlots(profile, 14);
  const slot = slots.find((s) => s.startsAt === startsAt && s.available);
  if (!slot) {
    res.status(409).json({ error: "Slot unavailable" });
    return;
  }

  const clientName =
    [tg.first_name, tg.last_name].filter(Boolean).join(" ") || "Клиент";

  try {
    await upsertUser(tg);
    const booking = await createBooking({
      masterId,
      clientId: tg.id,
      clientName,
      startsAt,
      durationMin: profile.duration,
      price: profile.price,
    });

    void notifyBookingCreated({
      booking,
      masterName: profile.name,
      masterTimezone: profile.timezone,
    });

    res.status(201).json({
      booking: {
        id: booking.id,
        startsAt: booking.starts_at,
        time: formatTime(booking.starts_at, profile.timezone),
        date: formatDateLabel(booking.starts_at, profile.timezone),
        masterName: profile.name,
        duration: booking.duration_min,
        price: booking.price,
        status: booking.status,
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
      const profile = await getProfile(b.master_id);
      const tz = profile?.timezone ?? "Europe/Moscow";
      return {
        id: b.id,
        startsAt: b.starts_at,
        date: formatDateLabel(b.starts_at, tz),
        time: formatTime(b.starts_at, tz),
        masterId: b.master_id,
        masterName: profile?.name ?? "Мастер",
        duration: b.duration_min,
        price: b.price,
        status: b.status,
        cancelHours: profile?.cancel_hours ?? 24,
      };
    }),
  );
  res.json({ bookings: enriched });
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

    const slots = await generateSlots(profile, 14);
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
