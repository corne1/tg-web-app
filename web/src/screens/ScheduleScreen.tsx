import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchCabinetSessions, markBookingPaid } from "../api";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { cacheProfile, masterResumePath } from "../lib/profileStorage";
import type { SchedulePeriod, Session } from "../types";

const PERIODS: { id: SchedulePeriod; label: string }[] = [
  { id: "today", label: "Сегодня" },
  { id: "tomorrow", label: "Завтра" },
  { id: "week", label: "Неделя" },
];

function statusLabel(status: Session["status"]) {
  switch (status) {
    case "confirmed":
      return "подтверждена";
    case "cancelled":
      return "отменена";
    case "pending":
      return "ожидает";
    case "paid":
      return "оплачена";
  }
}

export function ScheduleScreen() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<SchedulePeriod>("today");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bookingLink, setBookingLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: SchedulePeriod) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCabinetSessions(p);
      if (data.profile) cacheProfile(data.profile);
      if (data.onboardingComplete === false) {
        navigate(masterResumePath(data.profile ?? null), { replace: true });
        return;
      }
      setSessions(data.sessions);
      setBookingLink(data.bookingLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load(period);
  }, [load, period]);

  const grouped = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const list = map.get(s.dateLabel) ?? [];
      list.push(s);
      map.set(s.dateLabel, list);
    }
    return [...map.entries()];
  }, [sessions]);

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

  const empty = !loading && sessions.filter((s) => s.status !== "cancelled").length === 0;

  return (
    <ScreenShell
      title="Расписание"
      subtitle="Нагрузка на сегодня и завтра"
      footer={
        <div className="footer-links">
          <Link to="/onboarding" className="text-link">
            Вернуться к онбордингу
          </Link>
          <Link to="/cabinet/empty" className="text-link">
            Поделиться ссылкой
          </Link>
          {bookingLink && (
            <Link to="/notifications" className="text-link">
              Уведомления →
            </Link>
          )}
        </div>
      }
    >
      <div className="period-switch" role="tablist">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period === p.id}
            className={`period-btn ${period === p.id ? "is-active" : ""}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="screen-subtitle">Загрузка…</p>
      ) : empty ? (
        <div className="empty-inline">
          <p>Нет записей за выбранный период</p>
          <Link to="/cabinet/empty" className="text-link">
            Отправить ссылку клиентам →
          </Link>
        </div>
      ) : (
        <div className="session-groups">
          {grouped.map(([label, items]) => (
            <section key={label} className="session-group">
              <h2 className="group-title">{label}</h2>
              <ul className="session-list">
                {items.map((session) => {
                  const paid = Boolean(session.paid) || session.status === "paid";
                  const cancelled = session.status === "cancelled";
                  return (
                    <li
                      key={session.id}
                      className={`session-card ${cancelled ? "is-cancelled" : ""}`}
                    >
                      <div className="session-meta">
                        <span className="session-time">{session.time}</span>
                        <span className="session-name">{session.clientName}</span>
                        <span
                          className={`session-status status-${paid ? "paid" : session.status}`}
                        >
                          {paid ? "оплачена" : statusLabel(session.status)}
                        </span>
                      </div>
                      {!cancelled && !paid && (
                        <UiMainButton
                          fullWidth={false}
                          className="btn-sm"
                          onClick={() => void markPaid(session.id)}
                        >
                          Отметить оплату
                        </UiMainButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </ScreenShell>
  );
}
