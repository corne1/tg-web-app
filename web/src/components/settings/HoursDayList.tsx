import {
  WEEKDAYS,
  type WeekdayId,
  type WorkingHours,
} from "../../lib/masterDraft";

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="5.5"
        y="5.5"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HoursDayList({
  hours,
  onToggle,
  onOpenTime,
  onCopy,
}: {
  hours: WorkingHours;
  onToggle: (id: WeekdayId) => void;
  onOpenTime: (id: WeekdayId, field: "start" | "end") => void;
  onCopy: () => void;
}) {
  return (
    <section className="ms-hours-section">
      <div className="ms-hours-section-head">
        <h3 className="ms-hours-section-title">Рабочие дни</h3>
        <button type="button" className="ms-link-btn" onClick={onCopy}>
          <CopyIcon />
          Копировать часы
        </button>
      </div>

      <ul className="ms-day-list">
        {WEEKDAYS.map((day) => {
          const row = hours[day.id];
          return (
            <li
              key={day.id}
              className={`ms-day-card ${row.enabled ? "is-on" : "is-off"}`}
            >
              <div className="ms-day-row">
                <p className="ms-day-name">{day.label}</p>
                <div className="ms-day-controls">
                  {row.enabled ? (
                    <span className="ms-day-badge" role="status">
                      <span className="ms-day-badge-dot" aria-hidden />
                      Рабочий день
                    </span>
                  ) : (
                    <span className="ms-day-badge is-off" role="status">
                      Выходной
                    </span>
                  )}
                  <button
                    type="button"
                    className={`ms-switch ${row.enabled ? "is-on" : ""}`}
                    role="switch"
                    aria-checked={row.enabled}
                    aria-label={`${day.label}: ${row.enabled ? "рабочий" : "выходной"}`}
                    onClick={() => onToggle(day.id)}
                  >
                    <span className="ms-switch-knob" />
                  </button>
                </div>
              </div>

              {row.enabled && (
                <div className="ms-day-times">
                  <button
                    type="button"
                    className="ms-time-chip"
                    onClick={() => onOpenTime(day.id, "start")}
                  >
                    {row.start}
                  </button>
                  <span className="ms-time-sep" aria-hidden>
                    —
                  </span>
                  <button
                    type="button"
                    className="ms-time-chip"
                    onClick={() => onOpenTime(day.id, "end")}
                  >
                    {row.end}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
