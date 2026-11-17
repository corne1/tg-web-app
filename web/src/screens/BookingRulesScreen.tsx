import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe, saveMasterBookingRules } from "../api";
import { SettingsPageShell } from "../components/settings/SettingsPageShell";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { cacheProfile } from "../lib/profileStorage";
import {
  BottomSheet,
  Button,
  ChevronRightIcon,
  RadioOption,
  SheetFooter,
  SheetHeader,
  SheetRadioList,
  cx,
} from "../ui";

const HOUR_OPTIONS = [1, 2, 6, 12, 24, 48, 72] as const;

type HourOption = (typeof HOUR_OPTIONS)[number];

type SheetKind = "cancel" | "reschedule" | null;

function isHourOption(n: number): n is HourOption {
  return (HOUR_OPTIONS as readonly number[]).includes(n);
}

function ruHoursLabel(hours: number): string {
  const n = Math.max(0, Math.round(hours));
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "часов";
  if (mod10 === 1 && mod100 !== 11) word = "час";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    word = "часа";
  return `${n} ${word}`;
}

/** Figma 21455:21865 — Правила записи. */
export function BookingRulesScreen() {
  const navigate = useNavigate();
  const [cancelEnabled, setCancelEnabled] = useState(true);
  const [rescheduleEnabled, setRescheduleEnabled] = useState(true);
  const [cancelHours, setCancelHours] = useState<HourOption>(24);
  const [rescheduleHours, setRescheduleHours] = useState<HourOption>(24);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [draftHours, setDraftHours] = useState<HourOption>(24);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMe()
      .then((me) => {
        if (cancelled || !me.profile) return;
        cacheProfile(me.profile);
        setCancelEnabled(me.profile.clientCancelEnabled !== false);
        setRescheduleEnabled(me.profile.clientRescheduleEnabled !== false);
        const ch = me.profile.cancelHours ?? 24;
        const rh = me.profile.rescheduleHours ?? ch;
        setCancelHours(isHourOption(ch) ? ch : 24);
        setRescheduleHours(isHourOption(rh) ? rh : 24);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const goBack = useCallback(
    () => navigate("/cabinet/profile"),
    [navigate],
  );
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const persist = useCallback(
    async (patch: {
      clientCancelEnabled?: boolean;
      clientRescheduleEnabled?: boolean;
      cancelHours?: number;
      rescheduleHours?: number;
    }) => {
      if (saving) return;
      setSaving(true);
      try {
        const profile = await saveMasterBookingRules(patch);
        cacheProfile(profile);
        setToast("Сохранено");
      } catch {
        setToast("Не удалось сохранить");
      } finally {
        setSaving(false);
      }
    },
    [saving],
  );

  const openSheet = (kind: Exclude<SheetKind, null>) => {
    setDraftHours(kind === "cancel" ? cancelHours : rescheduleHours);
    setSheet(kind);
  };

  const applySheet = () => {
    if (!sheet) return;
    if (sheet === "cancel") {
      setCancelHours(draftHours);
      void persist({ cancelHours: draftHours });
    } else {
      setRescheduleHours(draftHours);
      void persist({ rescheduleHours: draftHours });
    }
    setSheet(null);
  };

  const sheetTitle =
    sheet === "cancel"
      ? "Отмена не позднее чем за"
      : sheet === "reschedule"
        ? "Перенос не позднее чем за"
        : "";

  return (
    <SettingsPageShell
      title="Правила записи"
      onBack={goBack}
      toast={toast}
      toastTone={toast === "Сохранено" ? "success" : "danger"}
      onToastDismiss={() => setToast(null)}
    >
      <div className="ms-rules">
        <section className="ms-rules-section">
          <h2 className="ms-rules-section-title">Отмена записи</h2>
          <div className="ms-rules-card">
            <div className="ms-rules-row">
              <div className="ms-rules-copy">
                <p className="ms-rules-label">Самостоятельная отмена</p>
                <p className="ms-rules-lead">
                  Клиент сможет отменить запись самостоятельно
                </p>
              </div>
              <button
                type="button"
                className={cx("ms-switch", cancelEnabled && "is-on")}
                role="switch"
                aria-checked={cancelEnabled}
                aria-label="Самостоятельная отмена"
                disabled={saving}
                onClick={() => {
                  const next = !cancelEnabled;
                  setCancelEnabled(next);
                  void persist({ clientCancelEnabled: next });
                }}
              >
                <span className="ms-switch-knob" />
              </button>
            </div>
            {cancelEnabled ? (
              <>
                <hr className="ms-rules-rule" />
                <button
                  type="button"
                  className="ms-rules-link"
                  disabled={saving}
                  onClick={() => openSheet("cancel")}
                >
                  <span className="ms-rules-copy">
                    <span className="ms-rules-label">
                      Отменять не позднее чем за
                    </span>
                    <span className="ms-rules-value">
                      {ruHoursLabel(cancelHours)}
                    </span>
                  </span>
                  <ChevronRightIcon />
                </button>
              </>
            ) : null}
          </div>
        </section>

        <section className="ms-rules-section">
          <h2 className="ms-rules-section-title">Перенос записи</h2>
          <div className="ms-rules-card">
            <div className="ms-rules-row">
              <div className="ms-rules-copy">
                <p className="ms-rules-label">Самостоятельный перенос</p>
                <p className="ms-rules-lead">
                  Клиент сможет сам перенести запись на другое время
                </p>
              </div>
              <button
                type="button"
                className={cx("ms-switch", rescheduleEnabled && "is-on")}
                role="switch"
                aria-checked={rescheduleEnabled}
                aria-label="Самостоятельный перенос"
                disabled={saving}
                onClick={() => {
                  const next = !rescheduleEnabled;
                  setRescheduleEnabled(next);
                  void persist({ clientRescheduleEnabled: next });
                }}
              >
                <span className="ms-switch-knob" />
              </button>
            </div>
            {rescheduleEnabled ? (
              <>
                <hr className="ms-rules-rule" />
                <button
                  type="button"
                  className="ms-rules-link"
                  disabled={saving}
                  onClick={() => openSheet("reschedule")}
                >
                  <span className="ms-rules-copy">
                    <span className="ms-rules-label">
                      Перенести не позднее чем за
                    </span>
                    <span className="ms-rules-value">
                      {ruHoursLabel(rescheduleHours)}
                    </span>
                  </span>
                  <ChevronRightIcon />
                </button>
              </>
            ) : null}
          </div>
        </section>
      </div>

      <BottomSheet open={sheet != null} onClose={() => setSheet(null)}>
        <SheetHeader title={sheetTitle} onClose={() => setSheet(null)} />
        <SheetRadioList label={sheetTitle} className="ms-sheet-picker-list">
          {HOUR_OPTIONS.map((h) => {
            const checked = draftHours === h;
            return (
              <li key={h}>
                <RadioOption
                  id={`rules-hours-${h}`}
                  name="rules-hours"
                  label={ruHoursLabel(h)}
                  checked={checked}
                  onChange={() => setDraftHours(h)}
                />
              </li>
            );
          })}
        </SheetRadioList>
        <SheetFooter>
          <Button onClick={applySheet}>Готово</Button>
        </SheetFooter>
      </BottomSheet>
    </SettingsPageShell>
  );
}
