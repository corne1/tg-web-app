import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchSlots, rescheduleBooking } from "../../api";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { MsArrowRight } from "../../components/master/MsArrowRight";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import {
  clientBookingTotals,
  needsClientAddressStep,
  needsClientPlaceStep,
  patchClientDraft,
  readClientDraft,
  resolveClientServices,
} from "../../lib/clientBookingDraft";
import type { TimeSlot } from "../../types";
import { cx } from "../../ui";

export function ClientDateTimeScreen() {
  const { masterId: masterKey = "" } = useParams();
  const [search] = useSearchParams();
  const rescheduleId = search.get("reschedule");
  const navigate = useNavigate();
  const draft = useMemo(() => readClientDraft(), []);
  const services = resolveClientServices(draft);
  const totals = clientBookingTotals(services);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!rescheduleId && services.length === 0) {
      navigate(`/client/${encodeURIComponent(masterKey)}/services`, {
        replace: true,
      });
    }
  }, [masterKey, navigate, rescheduleId, services.length]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSlots(masterKey, {
          days: 14,
          durationMin: totals.totalMin || undefined,
        });
        if (cancelled) return;
        setSlots(data.slots.filter((s) => s.available));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Не удалось загрузить слоты",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [masterKey, totals.totalMin]);

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

  const goBack = useCallback(() => {
    if (rescheduleId) {
      navigate("/client/bookings");
      return;
    }
    if (needsClientAddressStep(draft.placeChoice)) {
      navigate(`/client/${encodeURIComponent(masterKey)}/address`);
      return;
    }
    if (needsClientPlaceStep(draft.place)) {
      navigate(`/client/${encodeURIComponent(masterKey)}/place`);
      return;
    }
    navigate(`/client/${encodeURIComponent(masterKey)}/services`);
  }, [draft.place, draft.placeChoice, masterKey, navigate, rescheduleId]);

  const continueNext = useCallback(async () => {
    if (!selected || submitting) return;
    if (rescheduleId) {
      setSubmitting(true);
      setError(null);
      try {
        await rescheduleBooking(rescheduleId, selected.startsAt);
        navigate("/client/bookings", {
          state: { justRescheduled: true },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось перенести");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    patchClientDraft({
      startsAt: selected.startsAt,
      dateLabel: selected.date,
      timeLabel: selected.time,
    });
    navigate(`/client/${encodeURIComponent(masterKey)}/data`);
  }, [masterKey, navigate, rescheduleId, selected, submitting]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <ClientFlowShell
      title="Дата и время"
      onBack={goBack}
      footer={
        <div className="ms-nb-footer">
          {!selected && !loading ? (
            <p className="ms-nb-footer-hint">Выберите дату и время</p>
          ) : null}
          {error ? <p className="ms-client-error">{error}</p> : null}
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            disabled={!selected || submitting}
            onClick={() => void continueNext()}
          >
            <span>{rescheduleId ? "Перенести" : "Продолжить"}</span>
            <MsArrowRight />
          </button>
        </div>
      }
    >
      <div className="ms-nb">
        <div className="ms-nb-intro">
          <h2 className="ms-nb-title">Когда вам удобно?</h2>
          <p className="ms-nb-lead">
            Показаны ближайшие свободные слоты
            {totals.totalMin ? ` · ${totals.totalMin} мин` : ""}
          </p>
        </div>

        {loading ? (
          <p className="ms-client-muted">Загрузка слотов…</p>
        ) : days.length === 0 ? (
          <p className="ms-client-muted">Нет доступных дат и времени</p>
        ) : (
          <div className="ms-client-slots">
            {days.map(([key, daySlots]) => {
              const [dayLabel, date] = key.split("|");
              return (
                <section key={key} className="ms-client-day">
                  <h3 className="ms-client-day-title">
                    {dayLabel}
                    {date ? <span> · {date}</span> : null}
                  </h3>
                  <div className="ms-client-slot-grid">
                    {daySlots.map((slot) => {
                      const on = selectedId === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          className={cx("ms-client-slot", on && "is-on")}
                          onClick={() => setSelectedId(slot.id)}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </ClientFlowShell>
  );
}
