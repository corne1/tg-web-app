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
import { monthTitle, sameDay } from "../../lib/scheduleUi";
import type { TimeSlot } from "../../types";
import { BottomSheet, SheetSimpleHeader, cx } from "../../ui";

type DayGroup = {
  key: string;
  dayLabel: string;
  date: string;
  dateISO: string;
  slots: TimeSlot[];
};

const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function parseSlotDate(slot: TimeSlot): Date | null {
  // Prefer startsAt; fall back to dayLabel/date strings.
  const d = new Date(slot.startsAt);
  if (!Number.isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return null;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildMonthCells(anchor: Date): Date[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startPad);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
    );
  }
  return cells;
}

export function ClientDateTimeScreen() {
  const { masterId: masterKey = "" } = useParams();
  const [search] = useSearchParams();
  const rescheduleId = search.get("reschedule");
  const navigate = useNavigate();
  const draft = useMemo(() => readClientDraft(), []);
  const services = resolveClientServices(draft);
  const totals = clientBookingTotals(services);
  const isVisit = draft.placeChoice === "visit";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [calOpen, setCalOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [monthAnchor, setMonthAnchor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

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
          visit: isVisit,
        });
        if (cancelled) return;
        const available = data.slots.filter((s) => s.available);
        setSlots(available);
        setSelectedId(null);
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
  }, [isVisit, masterKey, totals.totalMin]);

  const days: DayGroup[] = useMemo(() => {
    const map = new Map<string, DayGroup>();
    for (const slot of slots) {
      const parsed = parseSlotDate(slot);
      const iso = parsed ? dateKey(parsed) : slot.date;
      const key = iso;
      const existing = map.get(key);
      if (existing) existing.slots.push(slot);
      else {
        map.set(key, {
          key,
          dayLabel: slot.dayLabel,
          date: slot.date,
          dateISO: iso,
          slots: [slot],
        });
      }
    }
    return [...map.values()];
  }, [slots]);

  const daysWithSlots = useMemo(() => {
    const set = new Set(days.map((d) => d.dateISO));
    return set;
  }, [days]);

  useEffect(() => {
    if (days.length === 0) {
      setDayKey(null);
      return;
    }
    if (!dayKey || !days.some((d) => d.key === dayKey)) {
      setDayKey(days[0]!.key);
    }
  }, [dayKey, days]);

  const activeDay = days.find((d) => d.key === dayKey) ?? null;
  const selected = slots.find((s) => s.id === selectedId);
  const cells = useMemo(() => buildMonthCells(monthAnchor), [monthAnchor]);

  const goBack = useCallback(() => {
    if (rescheduleId) {
      navigate(`/client/bookings/${encodeURIComponent(rescheduleId)}`);
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
        navigate(`/client/bookings/${encodeURIComponent(rescheduleId)}`, {
          replace: true,
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
    <>
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
              Ближайшие свободные слоты
              {totals.totalMin ? ` · ${totals.totalMin} мин` : ""}
              {isVisit ? " · с учётом дороги" : ""}
            </p>
          </div>

          {loading ? (
            <p className="ms-client-muted">Загрузка слотов…</p>
          ) : days.length === 0 ? (
            <p className="ms-client-muted">Нет доступных дат и времени</p>
          ) : (
            <>
              <div className="ms-client-day-row">
                <div
                  className="ms-client-day-chips"
                  role="tablist"
                  aria-label="Даты"
                >
                  {days.map((day) => {
                    const on = day.key === dayKey;
                    return (
                      <button
                        key={day.key}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        className={cx("ms-client-day-chip", on && "is-on")}
                        onClick={() => {
                          setDayKey(day.key);
                          setSelectedId(null);
                        }}
                      >
                        <span className="ms-client-day-chip-label">
                          {day.dayLabel}
                        </span>
                        <span className="ms-client-day-chip-date">
                          {day.date}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="ms-client-cal-open"
                  onClick={() => setCalOpen(true)}
                >
                  Календарь
                </button>
              </div>

              {activeDay ? (
                <section
                  className="ms-client-day"
                  aria-label={activeDay.dayLabel}
                >
                  <h3 className="ms-client-day-title">Время</h3>
                  <div className="ms-client-slot-grid">
                    {activeDay.slots.map((slot) => {
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
              ) : null}
            </>
          )}
        </div>
      </ClientFlowShell>

      <BottomSheet open={calOpen} onClose={() => setCalOpen(false)}>
        <SheetSimpleHeader title="Выберите дату" />
        <div className="ms-nb-cal ms-client-cal-sheet">
          <div className="ms-nb-cal-head">
            <button
              type="button"
              className="ms-nb-cal-nav"
              aria-label="Предыдущий месяц"
              onClick={() =>
                setMonthAnchor(
                  new Date(
                    monthAnchor.getFullYear(),
                    monthAnchor.getMonth() - 1,
                    1,
                  ),
                )
              }
            >
              ‹
            </button>
            <p className="ms-nb-cal-title">{monthTitle(monthAnchor)}</p>
            <button
              type="button"
              className="ms-nb-cal-nav"
              aria-label="Следующий месяц"
              onClick={() =>
                setMonthAnchor(
                  new Date(
                    monthAnchor.getFullYear(),
                    monthAnchor.getMonth() + 1,
                    1,
                  ),
                )
              }
            >
              ›
            </button>
          </div>
          <div className="ms-nb-cal-dow">
            {DOW.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="ms-nb-cal-grid">
            {cells.map((day) => {
              const inMonth = day.getMonth() === monthAnchor.getMonth();
              const past = day < today;
              const iso = dateKey(day);
              const working = daysWithSlots.has(iso);
              const selected = dayKey === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!inMonth || past || !working}
                  className={cx(
                    "ms-nb-cal-day",
                    !inMonth && "is-out",
                    selected && "is-on",
                    sameDay(day, today) && "is-today",
                    working && inMonth && !past && "has-slots",
                  )}
                  onClick={() => {
                    setDayKey(iso);
                    setSelectedId(null);
                    setCalOpen(false);
                  }}
                >
                  {day.getDate()}
                  {working && inMonth && !past ? (
                    <span className="ms-nb-cal-day-dot" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
