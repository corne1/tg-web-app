import calendarIcon from "../../assets/cabinet/calendar.svg";
import clockIcon from "../../assets/cabinet/clock.svg";
import {
  HOURS_PRESETS,
  type HoursPresetId,
} from "../../lib/masterDraft";
import { RadioMark, cx } from "../../ui";

export function HoursPresetList({
  preset,
  onSelect,
}: {
  preset: HoursPresetId | null;
  onSelect: (id: Exclude<HoursPresetId, "manual">) => void;
}) {
  return (
    <section className="ms-hours-section">
      <h3 className="ms-hours-section-title">Быстрая настройка</h3>
      <div className="ms-preset-list">
        {HOURS_PRESETS.map((item) => {
          const active = preset === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={cx("ms-preset-card", active && "is-active")}
              onClick={() => onSelect(item.id)}
              aria-pressed={active}
            >
              <span className="ms-preset-text">
                <span className="ms-preset-title">{item.title}</span>
                <span className="ms-preset-meta">
                  <span className="ms-preset-meta-row">
                    <img src={clockIcon} width={20} height={20} alt="" aria-hidden />
                    <span>{item.hoursLabel}</span>
                  </span>
                  <span className="ms-preset-meta-row">
                    <img src={calendarIcon} width={20} height={20} alt="" aria-hidden />
                    <span>{item.offLabel}</span>
                  </span>
                </span>
              </span>
              <RadioMark checked={active} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
