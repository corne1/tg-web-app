import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchCabinetSessions,
  fetchMe,
  markBookingPaid,
  type AppUser,
} from "../api";
import { MasterTabBar } from "../components/master/MasterTabBar";
import { TgAvatar } from "../components/master/TgAvatar";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import { WEEKDAYS } from "../lib/masterDraft";
import { cacheProfile, masterResumePath } from "../lib/profileStorage";
import {
  CARD_TONES,
  addDays,
  dayTitle,
  firstName,
  monthTitle,
  sameDay,
  sessionEndClock,
  sessionStartDate,
  startOfWeek,
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

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 4.167v11.666M4.167 10h11.666"
        stroke="#fff"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect
        x="2.75"
        y="4.25"
        width="12.5"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2.75 7.5h12.5M6 2.75v2.5M12 2.75v2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 5.25V8l2 1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function toneForSession(index: number, cancelled: boolean): CardTone | "muted" {
  if (cancelled) return "muted";
  return CARD_TONES[index % CARD_TONES.length];
}

export function ScheduleScreen() {
  const navigate = useNavigate();
  const { user: tgUser } = useTelegram();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(new Date()));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, me] = await Promise.all([
        fetchCabinetSessions("week"),
        fetchMe().catch(() => null),
      ]);
      if (me?.user) setAppUser(me.user);
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
  const hoursText = workHoursLabel(selectedDate, profile?.workingHours);

  const tgDisplayName = [tgUser?.first_name, tgUser?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const appDisplayName = [appUser?.first_name, appUser?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const masterName =
    tgDisplayName ||
    appDisplayName ||
    profile?.name?.trim() ||
    "Мастер";
  const avatarUserId = tgUser?.id ?? appUser?.id ?? profile?.userId ?? 0;
  const photoUrl = tgUser?.photo_url || appUser?.photo_url || null;
  const staffLabel = firstName(
    tgUser?.first_name || appUser?.first_name || masterName,
  );

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

  return (
    <div className="master-setup ms-cabinet">
      <header className="ms-cab-header">
        <h1 className="ms-cab-title">Расписание</h1>
        <button
          type="button"
          className="ms-cab-add"
          aria-label="Поделиться ссылкой"
          onClick={() => navigate("/cabinet/empty")}
        >
          <PlusIcon />
        </button>
      </header>

      <div className="ms-body ms-cab-body">
        <div className="ms-cab-month-row">
          <button
            type="button"
            className="ms-cab-month"
            onClick={() => {
              const today = new Date();
              setSelectedDate(today);
              setWeekCursor(startOfWeek(today));
            }}
            aria-label="Перейти к сегодня"
          >
            <CalendarIcon />
            <span>{monthTitle(selectedDate)}</span>
          </button>
          <div className="ms-cab-week-nav">
            <button
              type="button"
              className="ms-cab-week-btn"
              aria-label="Предыдущая неделя"
              onClick={() => shiftWeek(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="ms-cab-week-btn"
              aria-label="Следующая неделя"
              onClick={() => shiftWeek(1)}
            >
              ›
            </button>
          </div>
        </div>

        <div className="ms-cab-week" role="listbox" aria-label="Дни недели">
          {weekDays.map((day, index) => {
            const active = sameDay(day, selectedDate);
            const today = sameDay(day, new Date());
            return (
              <button
                key={day.toISOString()}
                type="button"
                role="option"
                aria-selected={active}
                className={cx(
                  "ms-cab-day",
                  active && "is-active",
                  today && !active && "is-today",
                )}
                onClick={() => selectDay(day)}
              >
                <span className="ms-cab-day-wd">{WEEKDAYS[index].short}</span>
                <span className="ms-cab-day-num">{day.getDate()}</span>
              </button>
            );
          })}
        </div>

        <div className="ms-cab-day-meta">
          <h2 className="ms-cab-day-title">{dayTitle(selectedDate)}</h2>
          <p className="ms-cab-hours">
            <ClockIcon />
            <span>{hoursText}</span>
          </p>
        </div>

        <div className="ms-cab-staff" aria-label="Мастер">
          <div className="ms-cab-staff-item is-active">
            <TgAvatar
              className="ms-cab-avatar"
              photoUrl={photoUrl}
              name={tgUser?.first_name || appUser?.first_name || masterName}
              userId={avatarUserId}
              size={64}
              alt={staffLabel}
            />
            <span className="ms-cab-staff-name">{staffLabel}</span>
          </div>
        </div>

        <section className="ms-cab-timeline" aria-label="Расписание дня">
          <h3 className="ms-cab-section-title">Расписание дня</h3>

          {error && <p className="ms-footer-error">{error}</p>}

          {loading ? (
            <p className="ms-cab-empty-text">Загрузка…</p>
          ) : empty ? (
            <div className="ms-cab-empty">
              <p className="ms-cab-empty-text">Нет записей на этот день</p>
              <button
                type="button"
                className="ms-cab-empty-link"
                onClick={() => navigate("/cabinet/empty")}
              >
                Отправить ссылку клиентам →
              </button>
            </div>
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
                    className={cx("ms-cab-slot", `tone-${tone}`, cancelled && "is-cancelled")}
                  >
                    <div className="ms-cab-slot-time" aria-hidden>
                      <span>{session.time}</span>
                    </div>
                    <div className="ms-cab-slot-card">
                      <div className="ms-cab-slot-range">
                        {session.time}–{end}
                      </div>
                      <div className="ms-cab-slot-name">{session.clientName}</div>
                      <div className="ms-cab-slot-sub">
                        {paid ? "Оплачена" : statusLabel(session.status)}
                      </div>
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
