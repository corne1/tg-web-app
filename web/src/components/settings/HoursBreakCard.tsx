import infoIcon from "../../assets/onboarding/info.svg";
import {
  WEEKDAYS,
  type ScheduleBreak,
  type WeekdayId,
} from "../../lib/masterDraft";
import { ChevronRightIcon, cx } from "../../ui";

export function HoursBreakCard({
  scheduleBreak,
  onToggle,
  onOpenTime,
  onToggleDay,
}: {
  scheduleBreak: ScheduleBreak;
  onToggle: () => void;
  onOpenTime: (field: "start" | "end") => void;
  onToggleDay: (id: WeekdayId) => void;
}) {
  return (
    <section className="ms-hours-section">
      <h3 className="ms-hours-section-title">Перерыв в течение дня</h3>
      <div className="ms-break-card">
        <div className="ms-break-card-head">
          <div className="ms-break-card-copy">
            <p className="ms-break-card-title">Добавить перерыв</p>
            <p className="ms-break-card-sub">
              В это время клиенты не смогут записаться
            </p>
          </div>
          <button
            type="button"
            className={`ms-switch ${scheduleBreak.enabled ? "is-on" : ""}`}
            role="switch"
            aria-checked={scheduleBreak.enabled}
            aria-label="Добавить перерыв"
            onClick={onToggle}
          >
            <span className="ms-switch-knob" />
          </button>
        </div>

        {scheduleBreak.enabled ? (
          <>
            <div className="ms-break-fields">
              <label className="ms-break-field">
                <span className="ms-break-field-label">Начало перерыва</span>
                <button
                  type="button"
                  className={cx(
                    "ms-break-time-trigger",
                    !scheduleBreak.start && "is-placeholder",
                  )}
                  onClick={() => onOpenTime("start")}
                >
                  <span>{scheduleBreak.start ?? "Выберите время"}</span>
                  <ChevronRightIcon className="ms-sheet-chevron-right" />
                </button>
              </label>
              <label className="ms-break-field">
                <span className="ms-break-field-label">Окончание перерыва</span>
                <button
                  type="button"
                  className={cx(
                    "ms-break-time-trigger",
                    !scheduleBreak.end && "is-placeholder",
                  )}
                  onClick={() => onOpenTime("end")}
                >
                  <span>{scheduleBreak.end ?? "Выберите время"}</span>
                  <ChevronRightIcon className="ms-sheet-chevron-right" />
                </button>
              </label>
            </div>

            <div className="ms-break-days-block">
              <p className="ms-break-days-label">В какие дни действует?</p>
              <div className="ms-break-days" role="group" aria-label="Дни перерыва">
                {WEEKDAYS.map((day) => {
                  const on = scheduleBreak.days.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      className={cx("ms-break-day", on && "is-on")}
                      aria-pressed={on}
                      onClick={() => onToggleDay(day.id)}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}

        <div className="ms-break-optional-tip" role="note">
          <img
            className="ms-break-optional-tip-icon"
            src={infoIcon}
            width={20}
            height={20}
            alt=""
            aria-hidden
          />
          <span>Необязательно</span>
        </div>
      </div>
    </section>
  );
}
