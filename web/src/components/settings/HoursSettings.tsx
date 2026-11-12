import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveMasterHours, setMasterOnboardingStep } from "../../api";
import { MasterSetupChrome } from "../master/MasterSetupChrome";
import { MsArrowRight } from "../master/MsArrowRight";
import { SettingsPageShell } from "./SettingsPageShell";
import type { SettingsMode } from "./settingsMode";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import { useTelegram } from "../../hooks/useTelegram";
import calendarIcon from "../../assets/cabinet/calendar.svg";
import clockIcon from "../../assets/cabinet/clock.svg";
import infoIcon from "../../assets/onboarding/info.svg";
import {
  applyHoursPreset,
  defaultScheduleBreak,
  hasEnabledWorkingDay,
  HOURS_PRESETS,
  loadMasterDraft,
  minutesToTime,
  saveMasterDraft,
  timeOptions,
  timeToMinutes,
  WEEKDAYS,
  type DayHours,
  type HoursPresetId,
  type ScheduleBreak,
  type WeekdayId,
  type WorkingHours,
} from "../../lib/masterDraft";
import { cacheProfile } from "../../lib/profileStorage";
import {
  copyHoursToDays,
  toggleWorkingDay,
  updateWorkingDayTime,
} from "../../lib/workingHoursMutations";
import {
  BottomSheet,
  Button,
  ChevronDownIcon,
  ChevronRightIcon,
  Chip,
  RadioMark,
  SheetAltAction,
  SheetFooter,
  SheetHeader,
  SheetItem,
  SheetList,
  SheetSimpleHeader,
  cx,
} from "../../ui";

type Sheet =
  | { kind: "time"; day: WeekdayId; field: "start" | "end" }
  | { kind: "break-time"; field: "start" | "end" }
  | { kind: "copy-source" }
  | { kind: "copy-targets"; source: WeekdayId }
  | null;

const TIME_OPTS = timeOptions(30);

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

export function HoursSettings({ mode }: { mode: SettingsMode }) {
  const navigate = useNavigate();
  const isSettings = mode === "settings";
  const { webApp } = useTelegram();
  const initial = loadMasterDraft();
  const [hours, setHours] = useState<WorkingHours>(initial.hours);
  const [preset, setPreset] = useState<HoursPresetId | null>(
    initial.hoursPreset,
  );
  const [dayBreakMin] = useState<number | null>(initial.dayBreakMin);
  const [scheduleBreak, setScheduleBreak] = useState<ScheduleBreak>(
    initial.scheduleBreak ?? defaultScheduleBreak(),
  );
  const [sheet, setSheet] = useState<Sheet>(null);
  const [copySource, setCopySource] = useState<WeekdayId | null>(null);
  const [copyTargets, setCopyTargets] = useState<WeekdayId[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isSettings) return;
    void setMasterOnboardingStep(3)
      .then((p) => cacheProfile(p))
      .catch(() => undefined);
  }, [isSettings]);

  const persist = useCallback(
    (
      nextHours = hours,
      nextPreset = preset,
      nextScheduleBreak = scheduleBreak,
    ) => {
      const draft = loadMasterDraft();
      saveMasterDraft({
        ...draft,
        hours: nextHours,
        hoursPreset: nextPreset,
        dayBreakMin,
        scheduleBreak: nextScheduleBreak,
      });
    },
    [dayBreakMin, hours, preset, scheduleBreak],
  );

  const goBack = useCallback(() => {
    persist();
    navigate(isSettings ? "/cabinet/profile" : "/onboarding/services");
  }, [isSettings, navigate, persist]);

  const handleClose = useCallback(() => {
    persist();
    if (isSettings) {
      navigate("/cabinet/profile");
      return;
    }
    webApp?.close?.();
    navigate("/");
  }, [isSettings, navigate, persist, webApp]);

  const canContinue = hasEnabledWorkingDay(hours);

  const syncHoursToServer = useCallback(
    async (nextHours = hours, nextScheduleBreak = scheduleBreak) => {
      try {
        const profile = await saveMasterHours({
          hours: nextHours,
          dayBreakMin,
          scheduleBreak: nextScheduleBreak,
        });
        cacheProfile(profile);
      } catch {
        // Local draft remains; server sync retries on next continue/complete.
      }
    },
    [dayBreakMin, hours, scheduleBreak],
  );

  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    persist();
    void syncHoursToServer();
    if (isSettings) {
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate("/cabinet/profile");
      return;
    }
    webApp?.HapticFeedback?.impactOccurred("light");
    navigate("/onboarding/place");
  }, [
    canContinue,
    isSettings,
    navigate,
    persist,
    syncHoursToServer,
    webApp,
  ]);

  const handleSaveExit = useCallback(() => {
    persist();
    void syncHoursToServer();
    webApp?.HapticFeedback?.notificationOccurred("success");
    navigate(isSettings ? "/cabinet/profile" : "/");
  }, [isSettings, navigate, persist, syncHoursToServer, webApp]);

  const applyPreset = useCallback((id: Exclude<HoursPresetId, "manual">) => {
    const next = applyHoursPreset(id);
    setHours(next);
    setPreset(id);
    persist(next, id);
    webApp?.HapticFeedback?.selectionChanged?.();
  }, [persist, webApp]);

  const toggleDay = useCallback(
    (id: WeekdayId) => {
      setHours((prev) => {
        const next = toggleWorkingDay(prev, id);
        setPreset("manual");
        persist(next, "manual");
        return next;
      });
      webApp?.HapticFeedback?.selectionChanged?.();
    },
    [persist, webApp],
  );

  const updateDayTime = useCallback(
    (id: WeekdayId, patch: Partial<DayHours>) => {
      setHours((prev) => {
        const next = updateWorkingDayTime(prev, id, patch);
        setPreset("manual");
        persist(next, "manual");
        return next;
      });
    },
    [persist],
  );

  const enabledDays = useMemo(
    () => WEEKDAYS.filter((d) => hours[d.id].enabled),
    [hours],
  );

  const updateScheduleBreak = useCallback(
    (patch: Partial<ScheduleBreak>) => {
      setScheduleBreak((prev) => {
        const next = { ...prev, ...patch };
        persist(hours, preset, next);
        return next;
      });
      webApp?.HapticFeedback?.selectionChanged?.();
    },
    [hours, persist, preset, webApp],
  );

  const toggleBreakDay = useCallback(
    (id: WeekdayId) => {
      setScheduleBreak((prev) => {
        const has = prev.days.includes(id);
        const days = has
          ? prev.days.filter((d) => d !== id)
          : [...prev.days, id];
        const next = {
          ...prev,
          days: days.length > 0 ? days : prev.days,
        };
        persist(hours, preset, next);
        return next;
      });
      webApp?.HapticFeedback?.selectionChanged?.();
    },
    [hours, persist, preset, webApp],
  );

  const openCopy = useCallback(() => {
    if (enabledDays.length === 0) {
      setToast("Включите хотя бы один рабочий день");
      setTimeout(() => setToast(null), 2200);
      return;
    }
    setCopySource(enabledDays[0]?.id ?? null);
    setCopyTargets([]);
    setSheet({ kind: "copy-source" });
  }, [enabledDays]);

  const applyCopy = useCallback(() => {
    if (!sheet || sheet.kind !== "copy-targets") return;
    setHours((prev) => {
      const next = copyHoursToDays(prev, sheet.source, copyTargets);
      setPreset("manual");
      persist(next, "manual");
      return next;
    });
    setSheet(null);
    setCopyTargets([]);
    setToast(
      copyTargets.length === 1
        ? "Часы скопированы"
        : `Часы применены к ${copyTargets.length} дням`,
    );
    webApp?.HapticFeedback?.notificationOccurred("success");
    setTimeout(() => setToast(null), 2200);
  }, [copyTargets, persist, sheet, webApp]);

  const dismissToast = useCallback(() => setToast(null), []);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const footer = isSettings ? (
    <Button disabled={!canContinue} onClick={handleContinue}>
      Сохранить
    </Button>
  ) : (
    <>
      <p className="ms-next-hint">Следующий шаг — Место приёма</p>
      <Button disabled={!canContinue} onClick={handleContinue}>
        Продолжить
        <MsArrowRight />
      </Button>
      <Button variant="secondary" onClick={handleSaveExit}>
        Сохранить и выйти
      </Button>
    </>
  );

  const body = (
    <>
      <section className="ms-hero">
        <h2 className="ms-question">Когда вы принимаете клиентов?</h2>
        <p className="ms-lead">
          Выберите рабочие дни и часы. График можно будет изменить позже.
        </p>
      </section>

      <section className="ms-hours-section">
        <h3 className="ms-hours-section-title">Быстрая настройка</h3>
        <div className="ms-preset-list">
          {HOURS_PRESETS.map((p) => {
            const active = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={cx("ms-preset-card", active && "is-active")}
                onClick={() => applyPreset(p.id)}
                aria-pressed={active}
              >
                <span className="ms-preset-text">
                  <span className="ms-preset-title">{p.title}</span>
                  <span className="ms-preset-meta">
                    <span className="ms-preset-meta-row">
                      <img
                        src={clockIcon}
                        width={20}
                        height={20}
                        alt=""
                        aria-hidden
                      />
                      <span>{p.hoursLabel}</span>
                    </span>
                    <span className="ms-preset-meta-row">
                      <img
                        src={calendarIcon}
                        width={20}
                        height={20}
                        alt=""
                        aria-hidden
                      />
                      <span>{p.offLabel}</span>
                    </span>
                  </span>
                </span>
                <RadioMark checked={active} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="ms-hours-section">
        <div className="ms-hours-section-head">
          <h3 className="ms-hours-section-title">Рабочие дни</h3>
          <button type="button" className="ms-link-btn" onClick={openCopy}>
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
                      onClick={() => toggleDay(day.id)}
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
                      onClick={() =>
                        setSheet({ kind: "time", day: day.id, field: "start" })
                      }
                    >
                      {row.start}
                    </button>
                    <span className="ms-time-sep" aria-hidden>
                      —
                    </span>
                    <button
                      type="button"
                      className="ms-time-chip"
                      onClick={() =>
                        setSheet({ kind: "time", day: day.id, field: "end" })
                      }
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
              onClick={() =>
                updateScheduleBreak({ enabled: !scheduleBreak.enabled })
              }
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
                    onClick={() =>
                      setSheet({ kind: "break-time", field: "start" })
                    }
                  >
                    <span>{scheduleBreak.start ?? "Выберите время"}</span>
                    <ChevronRightIcon className="ms-sheet-chevron-right" />
                  </button>
                </label>
                <label className="ms-break-field">
                  <span className="ms-break-field-label">
                    Окончание перерыва
                  </span>
                  <button
                    type="button"
                    className={cx(
                      "ms-break-time-trigger",
                      !scheduleBreak.end && "is-placeholder",
                    )}
                    onClick={() =>
                      setSheet({ kind: "break-time", field: "end" })
                    }
                  >
                    <span>{scheduleBreak.end ?? "Выберите время"}</span>
                    <ChevronRightIcon className="ms-sheet-chevron-right" />
                  </button>
                </label>
              </div>

              <div className="ms-break-days-block">
                <p className="ms-break-days-label">В какие дни действует?</p>
                <div
                  className="ms-break-days"
                  role="group"
                  aria-label="Дни перерыва"
                >
                  {WEEKDAYS.map((day) => {
                    const on = scheduleBreak.days.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        className={cx("ms-break-day", on && "is-on")}
                        aria-pressed={on}
                        onClick={() => toggleBreakDay(day.id)}
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

      {sheet?.kind === "time" && (
        <TimeSheet
          title={
            sheet.field === "start"
              ? "Начало рабочего дня"
              : "Окончание рабочего дня"
          }
          dayLabel={
            WEEKDAYS.find((d) => d.id === sheet.day)?.label ?? ""
          }
          value={hours[sheet.day][sheet.field]}
          other={
            sheet.field === "start"
              ? hours[sheet.day].end
              : hours[sheet.day].start
          }
          field={sheet.field}
          constraintLabel={
            sheet.field === "end" ? "начала рабочего дня" : null
          }
          onClose={() => setSheet(null)}
          onPick={(value) => {
            updateDayTime(sheet.day, { [sheet.field]: value });
            setSheet(null);
          }}
        />
      )}

      {sheet?.kind === "break-time" && (
        <TimeSheet
          title={
            sheet.field === "start"
              ? "Начало перерыва"
              : "Окончание перерыва"
          }
          dayLabel="Перерыв"
          value={
            (sheet.field === "start"
              ? scheduleBreak.start
              : scheduleBreak.end) ??
            (sheet.field === "start" ? "13:00" : "14:00")
          }
          other={
            sheet.field === "start"
              ? (scheduleBreak.end ?? "23:30")
              : (scheduleBreak.start ?? "00:00")
          }
          field={sheet.field}
          constraintLabel={
            sheet.field === "end" && scheduleBreak.start
              ? "начала перерыва"
              : null
          }
          onClose={() => setSheet(null)}
          onPick={(value) => {
            if (sheet.field === "start") {
              const end = scheduleBreak.end;
              const clearEnd =
                end != null && timeToMinutes(value) >= timeToMinutes(end);
              updateScheduleBreak({
                start: value,
                end: clearEnd ? null : end,
              });
            } else {
              updateScheduleBreak({ end: value });
            }
            setSheet(null);
          }}
        />
      )}

      <BottomSheet
        open={sheet?.kind === "copy-source"}
        sheetClassName="ms-sheet-hours"
        onClose={() => setSheet(null)}
      >
        <SheetSimpleHeader
          title="Копировать часы"
          lead="Из какого дня скопировать время?"
        />
        <SheetList>
          {enabledDays.map((day) => {
            const row = hours[day.id];
            const active = copySource === day.id;
            return (
              <li key={day.id}>
                <SheetItem
                  active={active}
                  className="ms-sheet-item-row"
                  onClick={() => setCopySource(day.id)}
                >
                  <span>
                    {day.label}{" "}
                    <span className="ms-muted">
                      ({row.start}–{row.end})
                    </span>
                  </span>
                  <RadioMark checked={active} />
                </SheetItem>
              </li>
            );
          })}
        </SheetList>
        <Button
          disabled={!copySource}
          onClick={() => {
            if (!copySource) return;
            setCopyTargets([]);
            setSheet({ kind: "copy-targets", source: copySource });
          }}
        >
          Выбрать дни
        </Button>
        <Button variant="ghost" onClick={() => setSheet(null)}>
          Отмена
        </Button>
      </BottomSheet>

      <BottomSheet
        open={sheet?.kind === "copy-targets"}
        sheetClassName="ms-sheet-hours"
        onClose={() => {
          setSheet(null);
          setCopyTargets([]);
        }}
      >
        {sheet?.kind === "copy-targets" ? (
          <>
            <SheetSimpleHeader
              title="Копировать часы"
              lead={`Куда скопировать время ${hours[sheet.source].start}–${hours[sheet.source].end}?`}
            />
            <SheetList>
              {WEEKDAYS.filter((d) => d.id !== sheet.source).map((day) => {
                const checked = copyTargets.includes(day.id);
                return (
                  <li key={day.id}>
                    <SheetItem
                      active={checked}
                      className="ms-sheet-item-row"
                      onClick={() =>
                        setCopyTargets((prev) =>
                          checked
                            ? prev.filter((id) => id !== day.id)
                            : [...prev, day.id],
                        )
                      }
                    >
                      <span>{day.label}</span>
                      <span
                        className={cx("ms-check", checked && "is-on")}
                        aria-hidden
                      />
                    </SheetItem>
                  </li>
                );
              })}
            </SheetList>
            <Button disabled={copyTargets.length === 0} onClick={applyCopy}>
              {copyTargets.length === 0
                ? "Выберите дни"
                : copyTargets.length === 1
                  ? "Применить к 1 дню"
                  : `Применить к ${copyTargets.length} дням`}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSheet(null);
                setCopyTargets([]);
              }}
            >
              Отмена
            </Button>
          </>
        ) : null}
      </BottomSheet>

    </>
  );

  if (isSettings) {
    return (
      <SettingsPageShell
        title="Рабочее время"
        onBack={goBack}
        onClose={handleClose}
        toast={toast}
        toastTone="success"
        onToastDismiss={dismissToast}
        footer={footer}
      >
        {body}
      </SettingsPageShell>
    );
  }

  return (
    <MasterSetupChrome
      step={3}
      progressFilled={3}
      onBack={goBack}
      onClose={handleClose}
      toast={toast}
      toastTone="success"
      onToastDismiss={dismissToast}
      footer={footer}
    >
      {body}
    </MasterSetupChrome>
  );
}

const HOUR_OPTS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTS = Array.from({ length: 60 }, (_, i) => i);

function isTimeAllowed(
  candidate: string,
  field: "start" | "end",
  other: string,
): boolean {
  const mins = timeToMinutes(candidate);
  const otherMins = timeToMinutes(other);
  return field === "start" ? mins < otherMins : mins > otherMins;
}

/** Six half-hour chips around the current value (Figma Быстрый выбор). */
function quickTimeChoices(
  center: string,
  field: "start" | "end",
  other: string,
): string[] {
  const valid = TIME_OPTS.filter((t) => isTimeAllowed(t, field, other));
  if (valid.length === 0) return [];

  const centerMin = timeToMinutes(center);
  const window: string[] = [];
  for (let i = -2; i <= 3; i++) {
    const t = minutesToTime(centerMin + i * 30);
    if (valid.includes(t)) window.push(t);
  }
  if (window.length === 6) return window;

  return [...valid]
    .sort(
      (a, b) =>
        Math.abs(timeToMinutes(a) - centerMin) -
        Math.abs(timeToMinutes(b) - centerMin),
    )
    .slice(0, 6)
    .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

function TimeSheet({
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

  const quick = useMemo(
    () => quickTimeChoices(draft, field, other),
    [draft, field, other],
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
              <label className="ms-sheet-segment">
                <span className="ms-sheet-segment-label">Часы</span>
                <span className="ms-sheet-segment-control-wrap">
                  <select
                    className="ms-sheet-segment-control"
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
              </label>
              <label className="ms-sheet-segment">
                <span className="ms-sheet-segment-label">Минуты</span>
                <span className="ms-sheet-segment-control-wrap">
                  <select
                    className="ms-sheet-segment-control"
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
              </label>
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
