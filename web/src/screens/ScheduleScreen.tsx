import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { todaySessions, tomorrowSessions, weekSessions } from "../data/mock";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
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
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());

  const sessions = useMemo(() => {
    if (period === "today") return todaySessions;
    if (period === "tomorrow") return tomorrowSessions;
    return weekSessions;
  }, [period]);

  const grouped = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const list = map.get(s.dateLabel) ?? [];
      list.push(s);
      map.set(s.dateLabel, list);
    }
    return [...map.entries()];
  }, [sessions]);

  function markPaid(id: string) {
    setPaidIds((prev) => new Set(prev).add(id));
  }

  const goHome = useCallback(() => navigate("/"), [navigate]);
  useBackButton(goHome);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <ScreenShell
      title="Расписание"
      subtitle="Нагрузка на сегодня и завтра"
      footer={
        <div className="footer-links">
          <Link to="/cabinet/empty" className="text-link">
            Пустое состояние
          </Link>
          <Link to="/notifications" className="text-link">
            Уведомления →
          </Link>
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

      <div className="session-groups">
        {grouped.map(([label, items]) => (
          <section key={label} className="session-group">
            <h2 className="group-title">{label}</h2>
            <ul className="session-list">
              {items.map((session) => {
                const paid = paidIds.has(session.id);
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
                        onClick={() => markPaid(session.id)}
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
    </ScreenShell>
  );
}
