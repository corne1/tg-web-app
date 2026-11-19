import { useEffect, useMemo, useRef, useState } from "react";
import { WEEKDAYS } from "../../lib/masterDraft";
import {
  addDays,
  monthTitle,
  sameDay,
  startOfWeek,
  MONTHS_GEN,
} from "../../lib/scheduleUi";
import {
  BottomSheet,
  Button,
  ChevronRightIcon,
  CloseIcon,
  IconButton,
  cx,
} from "../../ui";

type Props = {
  open: boolean;
  selected: Date;
  hasBooking: (day: Date) => boolean;
  onClose: () => void;
  onConfirm: (day: Date) => void;
};

function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  while (cells.length > 7) {
    const lastRow = cells.slice(-7);
    if (lastRow.some((day) => day.getMonth() === anchor.getMonth())) break;
    cells.splice(-7, 7);
  }
  return cells;
}

function LegendInfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle
        cx="10"
        cy="10"
        r="8.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10 9.15V14M10 6.35h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ScheduleDateSheet({
  open,
  selected,
  hasBooking,
  onClose,
  onConfirm,
}: Props) {
  const [draft, setDraft] = useState(selected);
  const [month, setMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setDraft(selected);
      setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
    wasOpen.current = open;
  }, [open, selected]);

  const cells = useMemo(() => monthGrid(month), [month]);

  const shiftMonth = (delta: number) => {
    setMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  };

  const pick = (day: Date) => {
    setDraft(day);
    if (
      day.getMonth() !== month.getMonth() ||
      day.getFullYear() !== month.getFullYear()
    ) {
      setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      sheetClassName="ms-cab-date-sheet"
    >
      <div className="ms-cab-date-head">
        <span className="ms-cab-date-head-side" aria-hidden />
        <h3 className="ms-sheet-toolbar-title">Выберите дату</h3>
        <IconButton
          label="Закрыть"
          className="ms-cab-date-close"
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      </div>

      <div className="ms-cab-date-cal">
        <div className="ms-cab-date-month">
          <button
            type="button"
            className="ms-cab-date-nav"
            aria-label="Предыдущий месяц"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronRightIcon className="ms-cab-date-chevron is-prev" />
          </button>
          <p className="ms-cab-date-month-title">{monthTitle(month)}</p>
          <button
            type="button"
            className="ms-cab-date-nav"
            aria-label="Следующий месяц"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRightIcon />
          </button>
        </div>

        <div className="ms-cab-date-dow" aria-hidden>
          {WEEKDAYS.map((day) => (
            <span key={day.id}>{day.short}</span>
          ))}
        </div>

        <div className="ms-cab-date-grid" role="grid" aria-label="Календарь">
          {cells.map((day) => {
            const inMonth = day.getMonth() === month.getMonth();
            const on = sameDay(day, draft);
            const booked = hasBooking(day);
            const label = `${day.getDate()} ${MONTHS_GEN[day.getMonth()]}`;
            return (
              <button
                key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                type="button"
                role="gridcell"
                aria-selected={on}
                aria-label={label}
                className={cx(
                  "ms-cab-date-day",
                  !inMonth && "is-out",
                  on && "is-on",
                )}
                onClick={() => pick(day)}
              >
                <span className="ms-cab-date-num">{day.getDate()}</span>
                {booked ? (
                  <span className="ms-cab-date-dot" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ms-cab-date-legend">
        <span className="ms-cab-date-legend-label">
          <span className="ms-cab-date-legend-dot" aria-hidden />
          Есть записи
        </span>
        <span className="ms-cab-date-legend-info" aria-hidden>
          <LegendInfoIcon />
        </span>
      </div>

      <Button onClick={() => onConfirm(draft)}>Готово</Button>
    </BottomSheet>
  );
}
