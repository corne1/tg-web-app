import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { saveMasterHours, setMasterOnboardingStep } from "../../api";
import { MasterSetupChrome } from "../master/MasterSetupChrome";
import { MsArrowRight } from "../master/MsArrowRight";
import { SettingsPageShell } from "./SettingsPageShell";
import type { SettingsMode } from "./settingsMode";
import {
  isFromReview,
  navigateToOnboardingReview,
} from "../../lib/onboardingReviewEdit";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import { useTelegram } from "../../hooks/useTelegram";
import {
  applyHoursPreset,
  defaultScheduleBreak,
  hasEnabledWorkingDay,
  loadMasterDraft,
  saveMasterDraft,
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
import { HoursBreakCard } from "./HoursBreakCard";
import { HoursDayList } from "./HoursDayList";
import { HoursPresetList } from "./HoursPresetList";
import { TimeSheet } from "./HoursTimeSheet";
import {
  BottomSheet,
  Button,
  ChevronRightIcon,
  RadioMark,
  SheetFooter,
  SheetHeader,
  SheetItem,
  SheetList,
  cx,
} from "../../ui";

type Sheet =
  | { kind: "time"; day: WeekdayId; field: "start" | "end" }
  | { kind: "break-time"; field: "start" | "end" }
  | { kind: "copy-source" }
  | { kind: "copy-targets"; source: WeekdayId }
  | null;

function dayHoursSecondary(row: DayHours): string {
  return row.enabled ? `${row.start}–${row.end}` : "Выходной";
}

function applyCopyLabel(count: number): string {
  if (count === 1) return "Применить к 1 дню";
  return `Применить к ${count} дням`;
}

export function HoursSettings({ mode }: { mode: SettingsMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSettings = mode === "settings";
  const { webApp } = useTelegram();
  const [fromReview] = useState(() => isFromReview(location.state));
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
    if (isSettings) {
      navigate("/cabinet/profile");
      return;
    }
    if (fromReview) {
      navigateToOnboardingReview(navigate);
      return;
    }
    navigate("/onboarding/services");
  }, [fromReview, isSettings, navigate, persist]);

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
    if (fromReview) {
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigateToOnboardingReview(navigate);
      return;
    }
    webApp?.HapticFeedback?.impactOccurred("light");
    navigate("/onboarding/place");
  }, [
    canContinue,
    fromReview,
    isSettings,
    navigate,
    persist,
    syncHoursToServer,
    webApp,
  ]);

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
  ) : fromReview ? (
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
    </>
  );

  const body = (
    <>
      {isSettings ? null : (
        <section className="ms-hero">
          <h2 className="ms-question">Когда вы принимаете клиентов?</h2>
          <p className="ms-lead">
            Выберите рабочие дни и часы. График можно будет изменить позже.
          </p>
        </section>
      )}

      {isSettings ? null : (
        <HoursPresetList preset={preset} onSelect={applyPreset} />
      )}

      <HoursDayList
        hours={hours}
        onToggle={toggleDay}
        onOpenTime={(id, field) => setSheet({ kind: "time", day: id, field })}
        onCopy={openCopy}
      />

      <HoursBreakCard
        scheduleBreak={scheduleBreak}
        onToggle={() => updateScheduleBreak({ enabled: !scheduleBreak.enabled })}
        onOpenTime={(field) => setSheet({ kind: "break-time", field })}
        onToggleDay={toggleBreakDay}
      />

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
        sheetClassName="ms-sheet-hours ms-sheet-copy"
        onClose={() => setSheet(null)}
      >
        <SheetHeader
          title="Копировать часы"
          lead="Шаг 1 из 2 · Выбор источника"
          onClose={() => setSheet(null)}
        />
        <div className="ms-copy-body">
          <p className="ms-copy-prompt">
            Из какого дня скопировать рабочее время?
          </p>
          <SheetList>
            {WEEKDAYS.map((day) => {
              const row = hours[day.id];
              const active = copySource === day.id;
              return (
                <li key={day.id}>
                  <SheetItem
                    active={active}
                    className="ms-sheet-item-row"
                    onClick={() => setCopySource(day.id)}
                  >
                    <span className="ms-sheet-item-stack">
                      <span className="ms-sheet-item-primary">{day.label}</span>
                      <span className="ms-sheet-item-secondary">
                        {dayHoursSecondary(row)}
                      </span>
                    </span>
                    <RadioMark checked={active} />
                  </SheetItem>
                </li>
              );
            })}
          </SheetList>
        </div>
        <SheetFooter>
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
        </SheetFooter>
      </BottomSheet>

      <BottomSheet
        open={sheet?.kind === "copy-targets"}
        sheetClassName="ms-sheet-hours ms-sheet-copy"
        onClose={() => {
          setSheet(null);
          setCopyTargets([]);
        }}
      >
        {sheet?.kind === "copy-targets" ? (
          <>
            <SheetHeader
              title="Копировать часы"
              lead="Шаг 2 из 2 · Выбор дней"
              onBack={() => setSheet({ kind: "copy-source" })}
              onClose={() => {
                setSheet(null);
                setCopyTargets([]);
              }}
            />
            <div className="ms-copy-body">
              <button
                type="button"
                className="ms-copy-source"
                onClick={() => setSheet({ kind: "copy-source" })}
              >
                <span className="ms-copy-source-text">
                  <span className="ms-copy-source-label">Источник</span>
                  <span className="ms-copy-source-value">
                    {
                      WEEKDAYS.find((d) => d.id === sheet.source)?.label
                    }{" "}
                    {hours[sheet.source].start}–{hours[sheet.source].end}
                  </span>
                </span>
                <ChevronRightIcon className="ms-sheet-chevron-right" />
              </button>
              <p className="ms-copy-prompt">На какие дни применить?</p>
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
                        <span className="ms-sheet-item-stack">
                          <span className="ms-sheet-item-primary">
                            {day.label}
                          </span>
                          <span className="ms-sheet-item-secondary">
                            {dayHoursSecondary(hours[day.id])}
                          </span>
                        </span>
                        <span
                          className={cx("ms-check", checked && "is-on")}
                          aria-hidden
                        />
                      </SheetItem>
                    </li>
                  );
                })}
              </SheetList>
            </div>
            <SheetFooter>
              <Button disabled={copyTargets.length === 0} onClick={applyCopy}>
                {applyCopyLabel(copyTargets.length)}
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
            </SheetFooter>
          </>
        ) : null}
      </BottomSheet>

    </>
  );

  if (isSettings) {
    return (
      <SettingsPageShell
        title="Рабочее время"
        lead="Настройте дни и часы, когда вы принимаете клиентов."
        titlePlacement="page"
        onBack={goBack}
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
      toast={toast}
      toastTone="success"
      onToastDismiss={dismissToast}
      footer={footer}
    >
      {body}
    </MasterSetupChrome>
  );
}
