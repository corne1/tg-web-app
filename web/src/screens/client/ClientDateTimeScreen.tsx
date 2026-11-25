import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import calendarIcon from "../../assets/cabinet/calendar.svg";
import {
  fetchClientBooking,
  fetchSlots,
  rescheduleBooking,
} from "../../api";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { MsArrowRight } from "../../components/master/MsArrowRight";
import { ServiceSparkIcon } from "../../components/master/ServiceSparkIcon";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import {
  clientBookingTotals,
  needsClientAddressStep,
  needsClientPlaceStep,
  patchClientDraft,
  readClientDraft,
  resolveClientServices,
  servicesCountWord,
} from "../../lib/clientBookingDraft";
import { monthTitle, sameDay } from "../../lib/scheduleUi";
import type { ClientBooking, TimeSlot } from "../../types";
import { BottomSheet, Button, SheetSimpleHeader, cx } from "../../ui";

type DayGroup = {
  key: string;
  dayLabel: string;
  date: string;
  dateISO: string;
  dayNum: number;
  dow: string;
  slots: TimeSlot[];
};

const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const DOW_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function parseSlotDate(slot: TimeSlot): Date | null {
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

function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
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

function hmToMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function groupDaySlots(slots: TimeSlot[]): { label: string; slots: TimeSlot[] }[] {
  const morning = slots.filter((s) => hmToMin(s.time) < 12 * 60);
  const day = slots.filter((s) => {
    const m = hmToMin(s.time);
    return m >= 12 * 60 && m < 17 * 60;
  });
  const evening = slots.filter((s) => hmToMin(s.time) >= 17 * 60);
  const groups: { label: string; slots: TimeSlot[] }[] = [];
  if (morning.length) groups.push({ label: "Утро", slots: morning });
  if (day.length) groups.push({ label: "День", slots: day });
  if (evening.length) groups.push({ label: "Вечер", slots: evening });
  return groups;
}

/** Figma pencil (same geometry as cabinet/profile/pencil.svg), tinted via currentColor. */
function hoursWord(h: number): string {
  const mod10 = h % 10;
  const mod100 = h % 100;
  if (mod10 === 1 && mod100 !== 11) return "час";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "часа";
  return "часов";
}

/** Figma choice card: «3 часа», not short «3 ч». */
function formatDurationLong(mins: number): string {
  if (mins < 60) return `${mins} мин`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} ${hoursWord(h)}`;
  return `${h} ${hoursWord(h)} ${m} мин`;
}

function ChoiceEditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m15 5 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<ClientBooking | null>(
    null,
  );

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
    if (!rescheduleId) {
      setCurrentBooking(null);
      return;
    }
    let cancelled = false;
    void fetchClientBooking(rescheduleId)
      .then((data) => {
        if (!cancelled) setCurrentBooking(data.booking);
      })
      .catch(() => {
        if (!cancelled) setCurrentBooking(null);
      });
    return () => {
      cancelled = true;
    };
  }, [rescheduleId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSlots(masterKey, {
          days: 42,
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
      const existing = map.get(iso);
      if (existing) {
        existing.slots.push(slot);
        continue;
      }
      const d = parsed ?? parseISODate(iso);
      map.set(iso, {
        key: iso,
        dayLabel: slot.dayLabel,
        date: slot.date,
        dateISO: iso,
        dayNum: d ? d.getDate() : Number(iso.slice(-2)) || 0,
        dow: d ? DOW_SHORT[d.getDay()]! : "",
        slots: [slot],
      });
    }
    return [...map.values()];
  }, [slots]);

  const daysWithSlots = useMemo(
    () => new Set(days.map((d) => d.dateISO)),
    [days],
  );

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
  const slotGroups = useMemo(
    () => (activeDay ? groupDaySlots(activeDay.slots) : []),
    [activeDay],
  );

  const stripMonthTitle = useMemo(() => {
    if (activeDay) {
      const d = parseISODate(activeDay.dateISO);
      if (d) return monthTitle(d);
    }
    return monthTitle(monthAnchor);
  }, [activeDay, monthAnchor]);

  const choiceMeta = `${services.length} ${servicesCountWord(services.length)} · ${formatDurationLong(totals.totalMin)}`;

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

  const continueNext = useCallback(() => {
    if (!selected || submitting) return;
    if (rescheduleId) {
      setConfirmOpen(true);
      return;
    }
    patchClientDraft({
      startsAt: selected.startsAt,
      dateLabel: selected.date,
      timeLabel: selected.time,
    });
    navigate(`/client/${encodeURIComponent(masterKey)}/data`);
  }, [masterKey, navigate, rescheduleId, selected, submitting]);

  const confirmReschedule = useCallback(async () => {
    if (!selected || !rescheduleId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await rescheduleBooking(rescheduleId, selected.startsAt);
      setConfirmOpen(false);
      navigate(`/client/bookings/${encodeURIComponent(rescheduleId)}`, {
        replace: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось перенести");
    } finally {
      setSubmitting(false);
    }
  }, [navigate, rescheduleId, selected, submitting]);

  const selectDay = useCallback((iso: string) => {
    setDayKey(iso);
    setSelectedId(null);
    const d = parseISODate(iso);
    if (d) {
      setMonthAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, []);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <>
      <ClientFlowShell
        title="Дата и время"
        onBack={goBack}
        progressFilled={rescheduleId ? undefined : 3}
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
              onClick={continueNext}
            >
              <span>Продолжить</span>
              <MsArrowRight />
            </button>
          </div>
        }
      >
        <div className="ms-nb">
          <div className="ms-nb-intro">
            <h2 className="ms-nb-title">Когда вам удобно?</h2>
            <p className="ms-nb-lead">
              Выберите свободную дату и время для записи
            </p>
          </div>

          {rescheduleId && currentBooking ? (
            <p className="ms-client-reschedule-hint">
              Сейчас: {currentBooking.date} · {currentBooking.time}
            </p>
          ) : null}

          {!rescheduleId && services.length > 0 ? (
            <section className="ms-client-choice" aria-label="Ваш выбор">
              <div className="ms-client-choice-head">
                <span className="ms-client-choice-label">Ваш выбор</span>
                <button
                  type="button"
                  className="ms-client-choice-edit"
                  onClick={() =>
                    navigate(`/client/${encodeURIComponent(masterKey)}/services`)
                  }
                >
                  <ChoiceEditIcon />
                  <span>Изменить</span>
                </button>
              </div>
              {/* Figma 21467:29729 — Primary Elevated + drop shadow */}
              <div className="ms-client-choice-card">
                <span className="ms-service-avatar" aria-hidden>
                  <ServiceSparkIcon className="ms-service-spark" />
                </span>
                <div className="ms-client-choice-copy">
                  <p className="ms-client-choice-meta">{choiceMeta}</p>
                  <p className="ms-client-choice-titles">{totals.titles}</p>
                </div>
              </div>
            </section>
          ) : null}

          {loading ? (
            <p className="ms-client-muted">Загрузка слотов…</p>
          ) : days.length === 0 ? (
            <p className="ms-client-muted">Нет доступных дат и времени</p>
          ) : (
            <>
              <section className="ms-client-dates" aria-label="Дата">
                <div className="ms-client-dates-head">
                  <h3 className="ms-client-dates-month">{stripMonthTitle}</h3>
                  <button
                    type="button"
                    className="ms-client-cal-btn"
                    aria-label="Открыть календарь"
                    onClick={() => {
                      if (activeDay) {
                        const d = parseISODate(activeDay.dateISO);
                        if (d) {
                          setMonthAnchor(
                            new Date(d.getFullYear(), d.getMonth(), 1),
                          );
                        }
                      }
                      setCalOpen(true);
                    }}
                  >
                    <img
                      src={calendarIcon}
                      width={20}
                      height={20}
                      alt=""
                      aria-hidden
                    />
                  </button>
                </div>
                <div
                  className="ms-client-date-strip"
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
                        className={cx("ms-client-date-dot", on && "is-on")}
                        onClick={() => selectDay(day.key)}
                      >
                        <span className="ms-client-date-dot-num">
                          {day.dayNum}
                        </span>
                        <span className="ms-client-date-dot-dow">{day.dow}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {activeDay ? (
                <section
                  className="ms-client-slots"
                  aria-label={activeDay.dayLabel}
                >
                  {slotGroups.map((group) => (
                    <div key={group.label} className="ms-client-slot-group">
                      <h3 className="ms-client-slot-period">{group.label}</h3>
                      <div className="ms-client-slot-grid">
                        {group.slots.map((slot) => {
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
                    </div>
                  ))}
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
              const isSelected = dayKey === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!inMonth || past || !working}
                  className={cx(
                    "ms-nb-cal-day",
                    !inMonth && "is-out",
                    isSelected && "is-on",
                    sameDay(day, today) && "is-today",
                    working && inMonth && !past && "has-slots",
                  )}
                  onClick={() => selectDay(iso)}
                >
                  {day.getDate()}
                  {working && inMonth && !past ? (
                    <span className="ms-nb-cal-day-dot" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="ms-client-cal-legend">
            <span className="ms-client-cal-legend-dot" aria-hidden />
            Есть свободное время
          </p>
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            onClick={() => setCalOpen(false)}
          >
            Готово
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <SheetSimpleHeader title="Подтвердить перенос" />
        <div className="ms-client-reschedule-sheet">
          {currentBooking ? (
            <p className="ms-client-muted">
              Было: {currentBooking.date} · {currentBooking.time}
            </p>
          ) : null}
          {selected ? (
            <p className="ms-client-reschedule-new">
              Станет: {selected.date} · {selected.time}
            </p>
          ) : null}
          {error ? <p className="ms-client-error">{error}</p> : null}
          <div className="ms-client-cancel-actions">
            <Button
              className="ms-btn"
              variant="primary"
              disabled={submitting || !selected}
              onClick={() => void confirmReschedule()}
            >
              {submitting ? "Переносим…" : "Подтвердить перенос"}
            </Button>
            <Button
              className="ms-btn"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
            >
              Отмена
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
