import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { SecondaryButton } from "../components/calendar/SecondaryButton";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { getDisplayPsychologistName } from "../lib/profileStorage";

type Toast = string | null;

export function NotificationsScreen() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<Toast>(null);
  const name = getDisplayPsychologistName();

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  const goHome = useCallback(() => navigate("/"), [navigate]);
  useBackButton(goHome);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <ScreenShell title="Уведомления" subtitle="Превью сообщений клиенту и психологу">
      {toast && <div className="toast">{toast}</div>}

      <section className="notif-block">
        <h2 className="notif-role">Клиенту</h2>
        <div className="notif-card">
          <p className="notif-text">
            Напоминаем: завтра в 15:00 у вас консультация с {name}. Подтвердите или
            перенесите.
          </p>
          <div className="notif-actions">
            <UiMainButton
              fullWidth={false}
              className="btn-sm"
              onClick={() => flash("Запись подтверждена")}
            >
              Подтвердить
            </UiMainButton>
            <SecondaryButton
              fullWidth={false}
              className="btn-sm"
              onClick={() => flash("Открыть перенос")}
            >
              Перенести
            </SecondaryButton>
          </div>
        </div>
      </section>

      <section className="notif-block">
        <h2 className="notif-role">Психологу</h2>
        <div className="notif-card">
          <p className="notif-text">Новая запись: Анна, четверг, 14:00.</p>
          <div className="notif-actions">
            <UiMainButton
              fullWidth={false}
              className="btn-sm"
              onClick={() => flash("Принято")}
            >
              Ок
            </UiMainButton>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => flash("Запись отменена")}
            >
              Отменить
            </button>
          </div>
        </div>
      </section>

      <Link to="/" className="text-link">
        ← На главную
      </Link>
    </ScreenShell>
  );
}
