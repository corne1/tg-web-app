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
import {
  applyHoursPreset,
  DAY_BREAK_OPTIONS,
  hasEnabledWorkingDay,
  HOURS_PRESETS,
  loadMasterDraft,
  saveMasterDraft,
  timeOptions,
  timeToMinutes,
  WEEKDAYS,
  type DayHours,
  type HoursPresetId,
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
  RadioMark,
  SelectTrigger,
  SheetItem,
  SheetList,
  SheetSimpleHeader,
  cx,
} from "../../ui";

type Sheet =
  | { kind: "time"; day: WeekdayId; field: "start" | "end" }
  | { kind: "copy-source" }
  | { kind: "copy-targets"; source: WeekdayId }
  | { kind: "break" }
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
  const [dayBreakMin, setDayBreakMin] = useState<number | null>(
    initial.dayBreakMin,
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
    (nextHours = hours, nextPreset = preset, nextBreak = dayBreakMin) => {
      const draft = loadMasterDraft();
      saveMasterDraft({
        ...draft,
        hours: nextHours,
        hoursPreset: nextPreset,
        dayBreakMin: nextBreak,
      });
    },
    [dayBreakMin, hours, preset],
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
    async (nextHours = hours, nextBreak = dayBreakMin) => {
      try {
        const profile = await saveMasterHours({
          hours: nextHours,
          dayBreakMin: nextBreak,
        });
        cacheProfile(profile);
      } catch {
        // Local draft remains; server sync retries on next continue/complete.
      }
    },
    [dayBreakMin, hours],
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

  const breakLabel =
    DAY_BREAK_OPTIONS.find((o) => o.value === dayBreakMin)?.label ?? "Не задан";

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
                  <div className="ms-day-meta">
                    <p className="ms-day-name">{day.label}</p>
                    <span
                      className={`ms-day-badge ${row.enabled ? "is-work" : "is-off"}`}
                    >
                      {row.enabled ? "Рабочий день" : "Выходной"}
                    </span>
                  </div>
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
        <h3 className="ms-hours-section-title">Перерывы в течение дня</h3>
        <SelectTrigger
          className="ms-break-select"
          value={
            <>
              <span className="ms-break-optional">Необязательно</span>
              {" · "}
              {breakLabel}
            </>
          }
          onClick={() => setSheet({ kind: "break" })}
        />
      </section>

      {sheet?.kind === "time" && (
        <TimeSheet
          title={
            sheet.field === "start"
              ? "Начало рабочего дня"
              : "Окончание рабочего дня"
          }
          value={hours[sheet.day][sheet.field]}
          other={
            sheet.field === "start"
              ? hours[sheet.day].end
              : hours[sheet.day].start
          }
          field={sheet.field}
          onClose={() => setSheet(null)}
          onPick={(value) => {
            updateDayTime(sheet.day, { [sheet.field]: value });
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

      <BottomSheet
        open={sheet?.kind === "break"}
        onClose={() => setSheet(null)}
      >
        <SheetSimpleHeader title="Перерыв в течение дня" />
        <SheetList>
          {DAY_BREAK_OPTIONS.map((opt) => (
            <li key={String(opt.value)}>
              <SheetItem
                active={dayBreakMin === opt.value}
                onClick={() => {
                  setDayBreakMin(opt.value);
                  persist(hours, preset, opt.value);
                  setSheet(null);
                }}
              >
                {opt.label}
              </SheetItem>
            </li>
          ))}
        </SheetList>
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

function TimeSheet({
  title,
  value,
  other,
  field,
  onClose,
  onPick,
}: {
  title: string;
  value: string;
  other: string;
  field: "start" | "end";
  onClose: () => void;
  onPick: (value: string) => void;
}) {
  const filtered = TIME_OPTS.filter((t) => {
    const mins = timeToMinutes(t);
    if (field === "start") return mins < timeToMinutes(other);
    return mins > timeToMinutes(other);
  });

  return (
    <BottomSheet open sheetClassName="ms-sheet-hours" onClose={onClose}>
      <SheetSimpleHeader title={title} />
      <SheetList className="ms-time-list">
        {filtered.map((t) => (
          <li key={t}>
            <SheetItem active={t === value} onClick={() => onPick(t)}>
              {t}
            </SheetItem>
          </li>
        ))}
      </SheetList>
    </BottomSheet>
  );
}
