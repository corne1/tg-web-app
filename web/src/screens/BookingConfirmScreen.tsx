import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createBooking } from "../api";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { ConfirmCardSkeleton } from "../components/calendar/Skeleton";
import { SecondaryButton } from "../components/calendar/SecondaryButton";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";

type BookingState = {
  psychologistId: number;
  psychologistName: string;
  startsAt: string;
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state) {
      navigate("/client", { replace: true });
      return;
    }
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [state, navigate]);

  const confirm = useCallback(async () => {
    if (!state || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createBooking({
        psychologistId: state.psychologistId,
        startsAt: state.startsAt,
      });
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate("/client/bookings", { state: { justBooked: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось записаться");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setSubmitting(false);
    }
  }, [navigate, state, submitting, webApp]);

  const goClient = useCallback(() => {
    if (state?.psychologistId) {
      navigate(`/client/${state.psychologistId}`);
      return;
    }
    navigate("/client");
  }, [navigate, state?.psychologistId]);

  useBackButton(goClient);
  useMainButton({
    text: submitting ? "Запись…" : "Подтвердить",
    visible: isTelegram && !loading && Boolean(state) && !submitting,
    onClick: () => {
      void confirm();
    },
  });

  if (!state) return null;

  return (
    <ScreenShell
      title="Подтверждение записи"
      subtitle="Проверьте детали перед подтверждением"
      footer={
        <>
          {!isTelegram && (
            <UiMainButton onClick={() => void confirm()} disabled={loading || submitting}>
              {submitting ? "Запись…" : "Подтвердить"}
            </UiMainButton>
          )}
          <SecondaryButton onClick={goClient} disabled={loading || submitting}>
            Изменить время
          </SecondaryButton>
        </>
      }
    >
      {error && <p className="error">{error}</p>}
      {loading ? (
        <ConfirmCardSkeleton />
      ) : (
        <div className="summary-card">
          <p className="summary-label">Консультация с {state.psychologistName}</p>
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
