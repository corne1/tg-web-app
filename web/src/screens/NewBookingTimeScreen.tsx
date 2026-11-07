import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookingClientSummary } from "../components/booking/BookingClientSummary";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { MsArrowRight } from "../components/master/MsArrowRight";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import {
  bookingTotals,
  dateToISO,
  formatBookingDayTitle,
  formatDuration,
  generateDaySlots,
  groupSlots,
  isoToDate,
  patchBookingDraft,
  readBookingDraft,
  resolveBookingClient,
  resolveBookingServices,
} from "../lib/bookingDraft";
import { loadMasterDraft } from "../lib/masterDraft";
import { monthTitle, sameDay } from "../lib/scheduleUi";
import { cx } from "../ui";
import { bookingNeedsPlaceStep } from "./NewBookingPlaceScreen";

const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function buildMonthCells(anchor: Date): Date[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startPad);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return cells;
}

export function NewBookingTimeScreen() {
  const navigate = useNavigate();
  const draft = useMemo(() => readBookingDraft(), []);
  const client = resolveBookingClient(draft.clientId, draft);
  const services = resolveBookingServices(draft.serviceIds);
  const totals = bookingTotals(services);
  const hours = loadMasterDraft().hours;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [monthAnchor, setMonthAnchor] = useState(() => {
    const base = draft.dateISO ? isoToDate(draft.dateISO) : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() =>
    draft.dateISO ? isoToDate(draft.dateISO) : null,
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(
    () => draft.time,
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [customHm, setCustomHm] = useState(draft.time ?? "10:00");

  const cells = useMemo(() => buildMonthCells(monthAnchor), [monthAnchor]);
  const slots = useMemo(() => {
    if (!selectedDate) return [];
    return generateDaySlots(selectedDate, hours, totals.totalMin || 30);
  }, [selectedDate, hours, totals.totalMin]);
  const groups = useMemo(() => groupSlots(slots), [slots]);
  const canContinue = Boolean(selectedDate && selectedTime);

  const goBack = useCallback(
    () => navigate("/cabinet/booking/new/service"),
    [navigate],
  );
  const goCabinet = useCallback(() => navigate("/cabinet"), [navigate]);
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  useEffect(() => {
    if (!client) {
      navigate("/cabinet/booking/new", { replace: true });
      return;
    }
    if (services.length === 0) {
      navigate("/cabinet/booking/new/service", { replace: true });
    }
  }, [client, services.length, navigate]);

  if (!client || services.length === 0) return null;

  const summaryMeta = `${formatDuration(totals.totalMin)} · ${totals.priceLabel}`;

  return (
    <MasterSetupChrome
      step={3}
      progressFilled={3}
      topTitle="Новая запись"
      onBack={goBack}
      onClose={goCabinet}
      footer={
        <div className="ms-nb-footer">
          {!canContinue && (
            <p className="ms-nb-footer-hint">Выберите дату и время</p>
          )}
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            disabled={!canContinue}
            onClick={() => {
              if (!selectedDate || !selectedTime) return;
              patchBookingDraft({
                dateISO: dateToISO(selectedDate),
                time: selectedTime,
              });
              const mode = loadMasterDraft().placeMode;
              navigate(
                bookingNeedsPlaceStep(mode)
                  ? "/cabinet/booking/new/place"
                  : "/cabinet/booking/new/confirm",
              );
            }}
          >
            <span>Продолжить</span>
            <MsArrowRight />
          </button>
        </div>
      }
    >
      <div className="ms-nb">
        <div className="ms-nb-intro">
          <h2 className="ms-nb-title">Дата и время</h2>
          <p className="ms-nb-lead">Когда удобно провести запись</p>
        </div>

        <BookingClientSummary
          client={client}
          servicesLine={totals.titles}
          durationPriceLine={summaryMeta}
        />

        <section className="ms-nb-cal" aria-label="Календарь">
          <div className="ms-nb-cal-head">
            <button
              type="button"
              className="ms-nb-cal-nav"
              aria-label="Предыдущий месяц"
              onClick={() =>
                setMonthAnchor(
                  new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1),
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
                  new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1),
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
              const selected = selectedDate ? sameDay(day, selectedDate) : false;
              const durationMin = totals.totalMin || 30;
              const daySlots = generateDaySlots(day, hours, durationMin);
              const working = daySlots.length > 0;
              return (
                <button
                  key={day.toISOString()}
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
                    setSelectedDate(day);
                    setSelectedTime(null);
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
        </section>

        {selectedDate ? (
          <section className="ms-nb-slots" aria-label="Слоты">
            <h3 className="ms-nb-slots-title">
              {formatBookingDayTitle(selectedDate)}
            </h3>
            {groups.length === 0 ? (
              <p className="ms-nb-slots-empty">
                Нет свободных слотов на этот день. Выберите другое время вручную
                или другую дату.
              </p>
            ) : (
              groups.map((g) => (
                <div key={g.label} className="ms-nb-slot-group">
                  <p className="ms-nb-slot-label">{g.label}</p>
                  <div className="ms-nb-slot-row">
                    {g.times.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={cx("ms-nb-slot", selectedTime === t && "is-on")}
                        onClick={() => setSelectedTime(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
            <button
              type="button"
              className="ms-nb-custom-time"
              onClick={() => setCustomOpen(true)}
            >
              Выбрать другое время
            </button>
          </section>
        ) : null}
      </div>

      {customOpen ? (
        <div className="ms-nb-sheet-root" role="dialog" aria-modal="true">
          <button
            type="button"
            className="ms-nb-sheet-backdrop"
            aria-label="Закрыть"
            onClick={() => setCustomOpen(false)}
          />
          <div className="ms-nb-sheet">
            <div className="ms-nb-sheet-handle" />
            <p className="ms-nb-sheet-title">Другое время</p>
            <label className="ms-field">
              <span className="ms-label">Время начала</span>
              <input
                className="ms-input"
                type="time"
                value={customHm}
                onChange={(e) => setCustomHm(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={cx("ms-btn", "ms-btn-primary", "ms-nb-sheet-ok")}
              onClick={() => {
                if (!customHm) return;
                setSelectedTime(customHm);
                setCustomOpen(false);
              }}
            >
              Готово
            </button>
          </div>
        </div>
      ) : null}
    </MasterSetupChrome>
  );
}
