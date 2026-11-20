import { useEffect, useMemo, useState } from "react";
import infoIcon from "../../assets/onboarding/info.svg";
import { minutesToTime, timeToMinutes } from "../../lib/masterDraft";
import { isTimeAllowed, quickTimeChoices } from "../../lib/timeSheet";
import {
  BottomSheet,
  Button,
  ChevronDownIcon,
  ChevronRightIcon,
  Chip,
  SheetAltAction,
  SheetFooter,
  SheetHeader,
} from "../../ui";

const HOUR_OPTS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTS = Array.from({ length: 60 }, (_, i) => i);

export function TimeSheet({
  title,
  dayLabel,
  value,
  other,
  field,
  constraintLabel,
  onClose,
  onPick,
}: {
  title: string;
  dayLabel: string;
  value: string;
  other: string;
  field: "start" | "end";
  constraintLabel?: string | null;
  onClose: () => void;
  onPick: (value: string) => void;
}) {
  const [panel, setPanel] = useState<"list" | "custom">("list");
  const [draft, setDraft] = useState(value);
  const [customHours, setCustomHours] = useState(() =>
    Math.floor(timeToMinutes(value) / 60),
  );
  const [customMinutes, setCustomMinutes] = useState(
    () => timeToMinutes(value) % 60,
  );

  useEffect(() => {
    setDraft(value);
    setPanel("list");
    setCustomHours(Math.floor(timeToMinutes(value) / 60));
    setCustomMinutes(timeToMinutes(value) % 60);
  }, [value, field]);

  // Keep the chip window on the opened time. Rebuilding it from `draft`
  // shifts every label on tap, so the pressed time is replaced by a neighbor.
  const quick = useMemo(
    () => quickTimeChoices(value, field, other),
    [value, field, other],
  );

  const customValue = minutesToTime(customHours * 60 + customMinutes);
  const customValid = isTimeAllowed(customValue, field, other);

  const infoText =
    field === "end" && constraintLabel
      ? `Время должно быть позже ${constraintLabel} — ${other}`
      : null;

  const customLead =
    field === "start"
      ? "Укажите начало рабочего дня"
      : "Укажите окончание рабочего дня";

  return (
    <BottomSheet open sheetClassName="ms-sheet-picker" onClose={onClose}>
      <SheetHeader
        title={panel === "custom" ? "Другое время" : title}
        lead={panel === "custom" ? customLead : dayLabel}
        onClose={onClose}
        onBack={panel === "custom" ? () => setPanel("list") : undefined}
      />

      {panel === "list" ? (
        <>
          <div className="ms-time-sheet-body">
            {infoText ? (
              <div className="ms-info" role="note">
                <img
                  className="ms-info-icon"
                  src={infoIcon}
                  width={20}
                  height={20}
                  alt=""
                  aria-hidden
                />
                <div className="ms-info-copy">
                  <p>{infoText}</p>
                </div>
              </div>
            ) : null}

            <div className="ms-time-sheet-current">
              <span className="ms-time-sheet-current-label">Текущее время</span>
              <span className="ms-time-sheet-current-value">{draft}</span>
            </div>

            <div className="ms-time-sheet-quick-block">
              <p className="ms-time-sheet-quick-label">Быстрый выбор</p>
              <div
                className="ms-time-sheet-quick"
                role="radiogroup"
                aria-label="Быстрый выбор"
              >
                {quick.map((t) => (
                  <Chip
                    key={t}
                    active={t === draft}
                    className="ms-time-sheet-chip"
                    onClick={() => setDraft(t)}
                  >
                    {t}
                  </Chip>
                ))}
              </div>
            </div>

            <SheetAltAction
              label="Выбрать другое время"
              trailing={
                <ChevronRightIcon className="ms-sheet-chevron-right" />
              }
              onClick={() => {
                setCustomHours(Math.floor(timeToMinutes(draft) / 60));
                setCustomMinutes(timeToMinutes(draft) % 60);
                setPanel("custom");
              }}
            />
          </div>
          <SheetFooter>
            <Button
              disabled={!isTimeAllowed(draft, field, other)}
              onClick={() => onPick(draft)}
            >
              Применить
            </Button>
          </SheetFooter>
        </>
      ) : (
        <>
          <div className="ms-sheet-custom-body">
            <div className="ms-sheet-dual">
              <div className="ms-sheet-segment">
                <span className="ms-sheet-segment-label" id="ms-time-hours-label">
                  Часы
                </span>
                <span className="ms-sheet-segment-control-wrap">
                  <select
                    className="ms-sheet-segment-control"
                    aria-labelledby="ms-time-hours-label"
                    value={customHours}
                    onChange={(e) => setCustomHours(Number(e.target.value))}
                  >
                    {HOUR_OPTS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="ms-select-chevron" />
                </span>
              </div>
              <div className="ms-sheet-segment">
                <span className="ms-sheet-segment-label" id="ms-time-minutes-label">
                  Минуты
                </span>
                <span className="ms-sheet-segment-control-wrap">
                  <select
                    className="ms-sheet-segment-control"
                    aria-labelledby="ms-time-minutes-label"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  >
                    {MINUTE_OPTS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="ms-select-chevron" />
                </span>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button
              disabled={!customValid}
              onClick={() => {
                if (!customValid) return;
                onPick(customValue);
              }}
            >
              Применить
            </Button>
          </SheetFooter>
        </>
      )}
    </BottomSheet>
  );
}

