import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchSlots, rescheduleBooking } from "../api";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { SlotGridSkeleton } from "../components/calendar/Skeleton";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import type { TimeSlot } from "../types";

export function SlotSelectionScreen() {
  const navigate = useNavigate();
  const { psychologistId: paramId } = useParams();
  const [search] = useSearchParams();
  const { isTelegram } = useTelegram();

  const masterKey = (paramId || search.get("p") || "").trim();
  const rescheduleId = search.get("reschedule");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [meta, setMeta] = useState<{
    id: number;
    name: string;
    duration: number;
    price: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!masterKey) {
        if (!cancelled) {
          setError("Откройте ссылку мастера, чтобы выбрать слот.");
          setLoading(false);
          setMeta(null);
          setSlots([]);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchSlots(masterKey);
        if (cancelled) return;
        setSlots(data.slots);
        setMeta(data.psychologist);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить слоты");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [masterKey]);

  const days = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    for (const slot of slots) {
      const key = `${slot.dayLabel}|${slot.date}`;
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [slots]);

  const selected = slots.find((s) => s.id === selectedId);

  const book = useCallback(async () => {
    if (!selected || !meta || submitting) return;

    if (rescheduleId) {
      setSubmitting(true);
      setError(null);
      try {
        await rescheduleBooking(rescheduleId, selected.startsAt);
        navigate("/client/bookings", { state: { justBooked: true } });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось перенести");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    navigate("/client/confirm", {
      state: {
        psychologistId: meta.id,
        psychologistName: meta.name,
        startsAt: selected.startsAt,
        dayLabel: selected.dayLabel,
        date: selected.date,
        time: selected.time,
        duration: meta.duration,
        price: meta.price,
      },
    });
  }, [meta, navigate, rescheduleId, selected, submitting]);

  const goBack = useCallback(() => {
    navigate(rescheduleId ? "/client/bookings" : "/");
  }, [navigate, rescheduleId]);

  useBackButton(goBack);
  useMainButton({
    text: selected
      ? rescheduleId
        ? `Перенести на ${selected.time}`
        : `Записаться на ${selected.time}`
      : "Выберите время",
    visible: isTelegram && Boolean(selected) && !submitting,
    onClick: () => {
      void book();
    },
  });

  if (!masterKey) {
    return (
      <ScreenShell title="Запись" subtitle="Нужна ссылка мастера">
        <div className="empty-inline">
          <p>
            Мастер отправляет персональную ссылку. Откройте её в Telegram — здесь
            появятся свободные слоты.
          </p>
          <Link to="/client/bookings" className="text-link">
            Мои записи →
          </Link>
          <Link to="/" className="text-link">
            ← На главную
          </Link>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title={rescheduleId ? "Перенос записи" : "Записаться на консультацию"}
      subtitle={
        meta
          ? `${meta.name} · ближайшие 7 дней`
          : "Выберите удобный слот на ближайшие 7 дней"
      }
      footer={
        !isTelegram ? (
          <UiMainButton onClick={() => void book()} disabled={!selected || submitting}>
            {selected
              ? rescheduleId
                ? `Перенести на ${selected.time}`
                : `Записаться на ${selected.time}`
              : "Выберите время"}
          </UiMainButton>
        ) : undefined
      }
    >
      {error && <p className="error">{error}</p>}
      {loading ? (
        <SlotGridSkeleton />
      ) : (
        <div className="slot-grid">
          {days.length === 0 ? (
            <p className="screen-subtitle">Нет свободных слотов на этой неделе</p>
          ) : (
            days.map(([key, daySlots]) => {
              const [dayLabel, date] = key.split("|");
              return (
                <div key={key} className="slot-day">
                  <div className="slot-day-head">
                    <strong>{dayLabel}</strong>
                    <span>{date}</span>
                  </div>
                  <div className="slot-times">
                    {daySlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!slot.available}
                        className={`slot-btn ${selectedId === slot.id ? "is-active" : ""} ${!slot.available ? "is-busy" : ""}`}
                        onClick={() => setSelectedId(slot.id)}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </ScreenShell>
  );
}
