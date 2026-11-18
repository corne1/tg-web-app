import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsPageShell } from "../components/settings/SettingsPageShell";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "../lib/notificationPrefs";
import { cx } from "../ui";

type PrefKey = keyof NotificationPrefs;

const BOOKING_ROWS: {
  key: PrefKey;
  label: string;
  lead: string;
}[] = [
  {
    key: "newBooking",
    label: "Новая запись",
    lead: "Клиент записался через вашу страницу",
  },
  {
    key: "reschedule",
    label: "Перенос записи",
    lead: "Клиент изменил дату или время",
  },
  {
    key: "cancel",
    label: "Отмена записи",
    lead: "Клиент отменил запись",
  },
];

/** Figma 21446:20001 — notification preference toggles. */
export function NotificationsScreen() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<NotificationPrefs>(() =>
    loadNotificationPrefs(),
  );

  const goBack = useCallback(
    () => navigate("/cabinet/profile"),
    [navigate],
  );
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const toggle = (key: PrefKey) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveNotificationPrefs(next);
      return next;
    });
  };

  return (
    <SettingsPageShell title="Уведомления" titlePlacement="page" onBack={goBack}>
      <div className="ms-rules">
        <section className="ms-rules-section">
          <h2 className="ms-rules-section-title">Уведомления о записях</h2>
          <div className="ms-rules-card">
            {BOOKING_ROWS.map((row, index) => (
              <div key={row.key}>
                {index > 0 ? <hr className="ms-rules-rule" /> : null}
                <div className="ms-rules-row">
                  <div className="ms-rules-copy">
                    <p className="ms-rules-label">{row.label}</p>
                    <p className="ms-rules-lead">{row.lead}</p>
                  </div>
                  <button
                    type="button"
                    className={cx("ms-switch", prefs[row.key] && "is-on")}
                    role="switch"
                    aria-checked={prefs[row.key]}
                    aria-label={row.label}
                    onClick={() => toggle(row.key)}
                  >
                    <span className="ms-switch-knob" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ms-rules-section">
          <h2 className="ms-rules-section-title">Напоминания</h2>
          <div className="ms-rules-card">
            <div className="ms-rules-row">
              <div className="ms-rules-copy">
                <p className="ms-rules-label">О предстоящих записях</p>
                <p className="ms-rules-lead">
                  Напоминать перед началом визита за 1 час
                </p>
              </div>
              <button
                type="button"
                className={cx("ms-switch", prefs.upcomingReminder && "is-on")}
                role="switch"
                aria-checked={prefs.upcomingReminder}
                aria-label="О предстоящих записях"
                onClick={() => toggle("upcomingReminder")}
              >
                <span className="ms-switch-knob" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </SettingsPageShell>
  );
}
