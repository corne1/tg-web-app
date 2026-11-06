import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCabinetSessions, markBookingPaid } from "../api";
import calendarIcon from "../assets/cabinet/calendar.svg";
import circlePlusIcon from "../assets/cabinet/circle-plus.svg";
import clockIcon from "../assets/cabinet/clock.svg";
import clockPurpleIcon from "../assets/cabinet/clock-purple.svg";
import plusBtnIcon from "../assets/cabinet/plus-btn.svg";
import plusWhiteIcon from "../assets/cabinet/plus-white.svg";
import timerIcon from "../assets/cabinet/timer.svg";
import usersRoundIcon from "../assets/cabinet/users-round.svg";
import { ScheduleListSkeleton } from "../components/calendar/Skeleton";
import { MasterTabBar } from "../components/master/MasterTabBar";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { WEEKDAYS } from "../lib/masterDraft";
import { cacheProfile, masterResumePath } from "../lib/profileStorage";
import {
  CARD_TONES,
  addDays,
  dayTitle,
  monthTitle,
  sameDay,
  sessionEndClock,
  sessionStartDate,
  startOfWeek,
  workDayRange,
  workHoursLabel,
  type CardTone,
} from "../lib/scheduleUi";
import type { MasterProfile, Session } from "../types";
import { cx } from "../ui";

function statusLabel(status: Session["status"]) {
  switch (status) {
    case "confirmed":
      return "Подтверждена";
    case "cancelled":
      return "Отменена";
    case "pending":
      return "Ожидает";
    case "paid":
      return "Оплачена";
  }
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function toneForSession(index: number, cancelled: boolean): CardTone | "muted" {
  if (cancelled) return "muted";
  return CARD_TONES[index % CARD_TONES.length];
}

export function ScheduleScreen() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(new Date()));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const weekTouchX = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCabinetSessions("week");
      if (data.profile) {
        cacheProfile(data.profile);
        setProfile(data.profile);
      }
      if (data.onboardingComplete === false) {
        navigate(masterResumePath(data.profile ?? null), { replace: true });
        return;
      }
      setSessions(data.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekCursor, i)),
    [weekCursor],
  );

  const bookedDayKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const session of sessions) {
      if (session.status === "cancelled") continue;
      const d = sessionStartDate(session.startsAt);
      if (d) keys.add(dayKey(d));
    }
    return keys;
  }, [sessions]);

  const daySessions = useMemo(() => {
    return sessions
      .filter((s) => {
        const d = sessionStartDate(s.startsAt);
        return d ? sameDay(d, selectedDate) : false;
      })
      .sort((a, b) => {
        const da = sessionStartDate(a.startsAt)?.getTime() ?? 0;
        const db = sessionStartDate(b.startsAt)?.getTime() ?? 0;
        return da - db;
      });
  }, [selectedDate, sessions]);

  const visibleSessions = daySessions.filter((s) => s.status !== "cancelled");
  const durationMin = profile?.duration ?? 60;
  const workRange = workDayRange(selectedDate, profile?.workingHours);
  const hoursText = workHoursLabel(selectedDate, profile?.workingHours);

  const selectDay = useCallback((day: Date) => {
    setSelectedDate(day);
    setWeekCursor(startOfWeek(day));
  }, []);

  const shiftWeek = useCallback((delta: number) => {
    setWeekCursor((prev) => {
      const next = addDays(prev, delta * 7);
      setSelectedDate((sel) => {
        const offset =
          (sel.getTime() - startOfWeek(sel).getTime()) / (24 * 60 * 60 * 1000);
        return addDays(next, Math.round(offset));
      });
      return next;
    });
  }, []);

  const goToday = useCallback(() => {
    const today = new Date();
    setSelectedDate(today);
    setWeekCursor(startOfWeek(today));
  }, []);

  const goAdd = useCallback(() => {
    navigate("/cabinet/booking/new");
  }, [navigate]);

  async function markPaid(id: string) {
    try {
      await markBookingPaid(id);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, paid: true, status: "paid" } : s,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отметить оплату");
    }
  }

  const goHome = useCallback(() => navigate("/"), [navigate]);
  useBackButton(goHome);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const empty =
    !loading && visibleSessions.length === 0 && daySessions.length === 0;
  const isDayOff = Boolean(profile?.workingHours) && !workRange;
  const showFreeSlot = empty && Boolean(workRange);

  return (
    <div className="master-setup ms-cabinet">
      <header className="ms-cab-header">
        <h1 className="ms-cab-title">Расписание</h1>
        <button
          type="button"
          className="ms-cab-add"
          aria-label="Добавить запись"
          onClick={goAdd}
        >
          <img src={plusWhiteIcon} width={20} height={20} alt="" />
        </button>
      </header>

      <div className="ms-body ms-cab-body">
        <div className="ms-cab-panel">
          <div className="ms-cab-month-row">
            <h2 className="ms-cab-month-title">{monthTitle(selectedDate)}</h2>
            <button
              type="button"
              className="ms-cab-cal-btn"
              onClick={goToday}
              aria-label="Перейти к сегодня"
            >
              <img src={calendarIcon} width={20} height={20} alt="" />
            </button>
          </div>

          <div
            className="ms-cab-week"
            role="listbox"
            aria-label="Дни недели"
            onTouchStart={(e) => {
              weekTouchX.current = e.changedTouches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const start = weekTouchX.current;
              weekTouchX.current = null;
              if (start == null) return;
              const end = e.changedTouches[0]?.clientX;
              if (end == null) return;
              const delta = end - start;
              if (Math.abs(delta) < 48) return;
              shiftWeek(delta < 0 ? 1 : -1);
            }}
          >
            {weekDays.map((day, index) => {
              const active = sameDay(day, selectedDate);
              const hasBookings = bookedDayKeys.has(dayKey(day));
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cx("ms-cab-day", active && "is-active")}
                  onClick={() => selectDay(day)}
                >
                  <span className="ms-cab-day-wd">{WEEKDAYS[index].short}</span>
                  <span className="ms-cab-day-num">
                    <span className="ms-cab-day-num-text">{day.getDate()}</span>
                    {hasBookings ? (
                      <span
                        className="ms-cab-day-dot"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <hr className="ms-cab-rule" />

        <div className="ms-cab-day-meta">
          <h2 className="ms-cab-day-title">{dayTitle(selectedDate)}</h2>
          <p className="ms-cab-hours">
            <img
              src={isDayOff ? clockIcon : timerIcon}
              width={20}
              height={20}
              alt=""
            />
            <span>{hoursText}</span>
          </p>
        </div>

        <hr className="ms-cab-rule" />

        <section className="ms-cab-timeline" aria-label="Расписание дня">
          <h3 className="ms-cab-section-title">Расписание дня</h3>

          {error && <p className="ms-footer-error">{error}</p>}

          {loading ? (
            <ScheduleListSkeleton />
          ) : empty ? (
            <>
              {showFreeSlot && workRange ? (
                <div className="ms-cab-free-row">
                  <span className="ms-cab-free-time">{workRange.start}</span>
                  <button
                    type="button"
                    className="ms-cab-free-pill"
                    onClick={goAdd}
                  >
                    <img src={clockIcon} width={20} height={20} alt="" />
                    <span className="ms-cab-free-label">
                      Свободное время · {workRange.start}–{workRange.end}
                    </span>
                    <img src={circlePlusIcon} width={20} height={20} alt="" />
                  </button>
                </div>
              ) : null}

              <div
                className={cx(
                  "ms-cab-empty-card",
                  isDayOff && "is-day-off",
                )}
              >
                <div className="ms-cab-empty-art" aria-hidden>
                  <span className="ms-cab-empty-ring">
                    <span className="ms-cab-empty-disc">
                      <img
                        src={isDayOff ? clockPurpleIcon : usersRoundIcon}
                        width={28}
                        height={28}
                        alt=""
                      />
                    </span>
                  </span>
                </div>
                <div className="ms-cab-empty-copy">
                  <p className="ms-cab-empty-title">
                    {isDayOff
                      ? "Сегодня выходной"
                      : "На выбранную дату пока нет записей"}
                  </p>
                  <p className="ms-cab-empty-sub">
                    {isDayOff
                      ? "Вы можете добавить запись на эту дату вручную"
                      : "Добавьте первую услугу, чтобы записать клиента"}
                  </p>
                </div>
                <button
                  type="button"
                  className="ms-cab-empty-cta"
                  onClick={goAdd}
                >
                  <img src={plusBtnIcon} width={20} height={20} alt="" />
                  <span>Добавить запись</span>
                </button>
              </div>
            </>
          ) : (
            <ul className="ms-cab-slots">
              {daySessions.map((session, index) => {
                const paid =
                  Boolean(session.paid) || session.status === "paid";
                const cancelled = session.status === "cancelled";
                const tone = toneForSession(index, cancelled);
                const end = sessionEndClock(
                  session.startsAt,
                  durationMin,
                  session.time,
                );
                return (
                  <li
                    key={session.id}
                    className={cx(
                      "ms-cab-slot",
                      `tone-${tone}`,
                      cancelled && "is-cancelled",
                    )}
                  >
                    <div className="ms-cab-slot-time" aria-hidden>
                      <span>{session.time}</span>
                    </div>
                    <div className="ms-cab-slot-card-wrap">
                      <button
                        type="button"
                        className="ms-cab-slot-card"
                        onClick={() =>
                          navigate(`/cabinet/booking/${session.id}`)
                        }
                      >
                        <div className="ms-cab-slot-range">
                          {session.time}–{end}
                        </div>
                        <div className="ms-cab-slot-name">
                          {session.clientName}
                        </div>
                        <div className="ms-cab-slot-sub">
                          {paid ? "Оплачена" : statusLabel(session.status)}
                        </div>
                      </button>
                      {!cancelled && !paid && (
                        <button
                          type="button"
                          className="ms-cab-slot-pay"
                          onClick={() => void markPaid(session.id)}
                        >
                          Отметить оплату
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <MasterTabBar />
    </div>
  );
}
