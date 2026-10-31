import { useEffect, useState } from "react";
import {
  BREAK_OPTIONS,
  DURATION_OPTIONS,
  MAX_BREAK_AFTER_MIN,
} from "../../../lib/masterDraft";
import type { ServiceFormState } from "../../../lib/serviceFormState";
import {
  breakError,
  splitDurationMinutes,
} from "../../../lib/serviceFormValidation";
import {
  BottomSheet,
  Button,
  ChevronRightIcon,
  Field,
  Input,
  RadioOption,
  SheetAltAction,
  SheetFooter,
  SheetHeader,
  SheetPickerGroup,
  SheetRadioList,
} from "../../../ui";

export type PickerKind = "duration" | "break";

type Form = ServiceFormState;
type Panel = "list" | "custom";

const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => i);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);

export function ServicePickerSheet({
  kind,
  form,
  breakErrorText,
  onClose,
  onApplyDuration,
  onApplyBreak,
  onValidationError,
}: {
  kind: PickerKind | null;
  form: Form;
  breakErrorText?: string;
  onClose: () => void;
  onApplyDuration: (next: {
    durationMin: number;
    useCustomDuration: boolean;
    customDuration: string;
  }) => void;
  onApplyBreak: (next: {
    breakAfterMin: number;
    useCustomBreak: boolean;
    customBreak: string;
  }) => void;
  onValidationError: (
    field: "durationMin" | "breakAfterMin",
    message: string,
  ) => void;
}) {
  const [panel, setPanel] = useState<Panel>("list");
  const [draftDuration, setDraftDuration] = useState(60);
  const [draftBreak, setDraftBreak] = useState(0);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(40);
  const [customBreak, setCustomBreak] = useState(form.customBreak);

  useEffect(() => {
    if (!kind) return;
    if (kind === "duration") {
      const mins = form.useCustomDuration
        ? Number(form.customDuration) || 40
        : form.durationMin;
      const parts = splitDurationMinutes(mins);
      setCustomHours(parts.hours);
      setCustomMinutes(parts.minutes);
      setDraftDuration(form.durationMin);
      setPanel(form.useCustomDuration ? "custom" : "list");
      return;
    }
    setDraftBreak(form.useCustomBreak ? 0 : form.breakAfterMin);
    setCustomBreak(form.customBreak || "20");
    setPanel(form.useCustomBreak ? "custom" : "list");
    // Snapshot form values only when the sheet opens / kind switches.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [kind]);

  if (!kind) return null;

  const title =
    panel === "custom"
      ? kind === "duration"
        ? "Своя длительность"
        : "Выбрать другое время"
      : kind === "duration"
        ? "Длительность услуги"
        : "Длительность перерыва";

  const listLabel =
    kind === "duration" ? "Длительность услуги" : "Длительность перерыва";

  return (
    <BottomSheet
      open
      compact={panel === "custom"}
      sheetClassName="ms-sheet-picker"
      onClose={onClose}
    >
      <SheetHeader
        title={title}
        onClose={onClose}
        onBack={panel === "custom" ? () => setPanel("list") : undefined}
      />

      {panel === "list" ? (
        <>
          <SheetPickerGroup>
            <SheetRadioList label={listLabel}>
              {kind === "duration" &&
                DURATION_OPTIONS.filter((o) => o.value !== -1).map((opt) => (
                  <li key={opt.value}>
                    <RadioOption
                      id={`sheet-duration-${opt.value}`}
                      name="sheet-duration"
                      label={opt.label}
                      checked={draftDuration === opt.value}
                      onChange={() => setDraftDuration(opt.value)}
                    />
                  </li>
                ))}
              {kind === "break" &&
                BREAK_OPTIONS.filter((o) => o.value !== -1).map((opt) => (
                  <li key={opt.value}>
                    <RadioOption
                      id={`sheet-break-${opt.value}`}
                      name="sheet-break"
                      label={opt.label}
                      checked={draftBreak === opt.value}
                      onChange={() => setDraftBreak(opt.value)}
                    />
                  </li>
                ))}
            </SheetRadioList>
            <SheetAltAction
              label="Выбрать другое время"
              trailing={<ChevronRightIcon className="ms-sheet-chevron-right" />}
              onClick={() => {
                if (kind === "duration") {
                  const mins = form.useCustomDuration
                    ? Number(form.customDuration) || 40
                    : 40;
                  const parts = splitDurationMinutes(mins);
                  setCustomHours(parts.hours);
                  setCustomMinutes(parts.minutes);
                } else {
                  setCustomBreak((v) => v || "20");
                }
                setPanel("custom");
              }}
            />
          </SheetPickerGroup>
          <SheetFooter>
            <Button
              onClick={() => {
                if (kind === "duration") {
                  onApplyDuration({
                    durationMin: draftDuration,
                    useCustomDuration: false,
                    customDuration: "",
                  });
                } else {
                  onApplyBreak({
                    breakAfterMin: draftBreak,
                    useCustomBreak: false,
                    customBreak: "",
                  });
                }
                onClose();
              }}
            >
              Готово
            </Button>
          </SheetFooter>
        </>
      ) : (
        <>
          <div className="ms-sheet-custom-body">
            {kind === "duration" ? (
              <div className="ms-sheet-dual">
                <label className="ms-sheet-segment">
                  <span className="ms-sheet-segment-label">Часы</span>
                  <select
                    className="ms-sheet-segment-control"
                    value={customHours}
                    onChange={(e) => setCustomHours(Number(e.target.value))}
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ms-sheet-segment">
                  <span className="ms-sheet-segment-label">Минуты</span>
                  <select
                    className="ms-sheet-segment-control"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  >
                    {MINUTE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <Field
                label="Минуты"
                as="label"
                className="ms-sheet-custom-field"
                error={breakErrorText}
              >
                <Input
                  invalid={Boolean(breakErrorText)}
                  type="number"
                  min={1}
                  max={MAX_BREAK_AFTER_MIN}
                  inputMode="numeric"
                  placeholder="20"
                  value={customBreak}
                  onChange={(e) => setCustomBreak(e.target.value)}
                  autoFocus
                />
              </Field>
            )}
          </div>
          <SheetFooter>
            <Button
              onClick={() => {
                if (kind === "duration") {
                  const mins = customHours * 60 + customMinutes;
                  if (mins <= 0) {
                    onValidationError(
                      "durationMin",
                      "Длительность должна быть больше 0 мин",
                    );
                    return;
                  }
                  onApplyDuration({
                    durationMin: mins,
                    useCustomDuration: true,
                    customDuration: String(mins),
                  });
                } else {
                  const value = customBreak || "20";
                  const msg = breakError(true, value);
                  if (msg) {
                    onValidationError("breakAfterMin", msg);
                    return;
                  }
                  onApplyBreak({
                    breakAfterMin: Number(value),
                    useCustomBreak: true,
                    customBreak: value,
                  });
                }
                onClose();
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
