import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cancelBooking, fetchMyBookings } from "../api";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { SecondaryButton } from "../components/calendar/SecondaryButton";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import type { ClientBooking } from "../types";

export function MyBookingsScreen() {
  const navigate = useNavigate();
  const { isTelegram } = useTelegram();
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyBookings();
      setBookings(data.bookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancel(id: string) {
    try {
      await cancelBooking(id);
      setBookings((list) => list.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отменить");
    }
  }

  const goHome = useCallback(() => navigate("/"), [navigate]);
  const bookAgain = useCallback(() => navigate("/client"), [navigate]);

  useBackButton(goHome);
  useMainButton({
    text: "Записаться",
    visible: isTelegram && !loading && bookings.length === 0,
    onClick: bookAgain,
  });

  return (
    <ScreenShell
      title="Мои записи"
      subtitle="Предстоящие консультации"
      footer={
        <div className="footer-links">
          <Link to="/" className="text-link">
            На главную
          </Link>
        </div>
      }
    >
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="screen-subtitle">Загрузка…</p>
      ) : bookings.length === 0 ? (
        <div className="empty-inline">
          <p>Нет предстоящих записей</p>
          <p className="screen-subtitle">
            Откройте ссылку мастера в Telegram, чтобы выбрать слот.
          </p>
          {!isTelegram && (
            <UiMainButton onClick={bookAgain}>Как записаться</UiMainButton>
          )}
        </div>
      ) : (
        <ul className="booking-list">
          {bookings.map((b) => (
            <li key={b.id} className="booking-card">
              <div className="booking-meta">
                <p className="booking-when">
                  {b.date}, {b.time}
                </p>
                <p className="booking-who">с {b.masterName}</p>
              </div>
              <div className="booking-actions">
                <SecondaryButton
                  fullWidth={false}
                  className="btn-sm"
                  onClick={() =>
                    navigate(
                      `/client/${b.masterId}?reschedule=${encodeURIComponent(b.id)}`,
                    )
                  }
                >
                  Перенести
                </SecondaryButton>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void cancel(b.id)}
                >
                  Отменить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ScreenShell>
  );
}
