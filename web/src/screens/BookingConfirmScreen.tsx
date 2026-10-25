import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { ConfirmCardSkeleton } from "../components/calendar/Skeleton";
import { SecondaryButton } from "../components/calendar/SecondaryButton";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  addClientBooking,
  getDisplayPsychologistName,
} from "../lib/profileStorage";

type BookingState = {
  dayLabel: string;
  date: string;
  time: string;
  duration: number;
  price: number;
};

export function BookingConfirmScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isTelegram, webApp } = useTelegram();
  const state = location.state as BookingState | null;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state) {
      navigate("/client", { replace: true });
      return;
    }
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, [state, navigate]);

  const confirm = useCallback(() => {
    if (!state) return;
    addClientBooking({
      id: `b-${Date.now()}`,
      date: `${state.dayLabel}, ${state.date}`,
      time: state.time,
      psychologistName: getDisplayPsychologistName(),
    });
    webApp?.HapticFeedback?.notificationOccurred("success");
    navigate("/client/bookings", { state: { justBooked: true } });
  }, [navigate, state, webApp]);

  const goClient = useCallback(() => navigate("/client"), [navigate]);
  useBackButton(goClient);
  useMainButton({
    text: "Подтвердить",
    visible: isTelegram && !loading && Boolean(state),
    onClick: confirm,
  });

  if (!state) return null;

  return (
    <ScreenShell
      title="Подтверждение записи"
      subtitle="Проверьте детали перед подтверждением"
      footer={
        <>
          {!isTelegram && (
            <UiMainButton onClick={confirm} disabled={loading}>
              Подтвердить
            </UiMainButton>
          )}
          <SecondaryButton onClick={goClient} disabled={loading}>
            Изменить время
          </SecondaryButton>
        </>
      }
    >
      {loading ? (
        <ConfirmCardSkeleton />
      ) : (
        <div className="summary-card">
          <p className="summary-label">Консультация</p>
          <p className="summary-main">
            {state.dayLabel}, {state.date} · {state.time}
          </p>
          <dl className="summary-facts">
            <div>
              <dt>Длительность</dt>
              <dd>{state.duration} мин</dd>
            </div>
            <div>
              <dt>Стоимость</dt>
              <dd>{state.price.toLocaleString("ru-RU")} ₽</dd>
            </div>
          </dl>
        </div>
      )}
    </ScreenShell>
  );
}
