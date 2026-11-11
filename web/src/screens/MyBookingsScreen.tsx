import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchMyBookings } from "../api";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { BookingsListSkeleton } from "../components/calendar/Skeleton";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import type { ClientBooking } from "../types";

export function MyBookingsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
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

  useEffect(() => {
    const focusId = (location.state as { focusId?: string } | null)?.focusId;
    if (focusId) {
      navigate(`/client/bookings/${encodeURIComponent(focusId)}`, {
        replace: true,
      });
    }
  }, [location.state, navigate]);

  const goHome = useCallback(() => navigate("/"), [navigate]);
  const bookAgain = useCallback(() => navigate("/client/bookings"), [navigate]);

  useBackButton(goHome);
  useMainButton({
    text: "Записаться",
    visible: isTelegram && !loading && bookings.length === 0,
    onClick: bookAgain,
  });

  return (
    <ScreenShell
      title="Мои записи"
      subtitle="Предстоящие визиты"
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
        <BookingsListSkeleton />
      ) : bookings.length === 0 ? (
        <div className="empty-inline">
          <p>Нет предстоящих записей</p>
          <p className="screen-subtitle">
            Откройте ссылку мастера в Telegram, чтобы записаться.
          </p>
          {!isTelegram && (
            <UiMainButton onClick={bookAgain}>Как записаться</UiMainButton>
          )}
        </div>
      ) : (
        <ul className="booking-list">
          {bookings.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className="booking-card ms-client-booking-card"
                onClick={() =>
                  navigate(`/client/bookings/${encodeURIComponent(b.id)}`)
                }
              >
                <div className="booking-meta">
                  <p className="booking-when">
                    {b.date}, {b.time}
                  </p>
                  <p className="booking-who">с {b.masterName}</p>
                  {b.serviceTitles && b.serviceTitles.length > 0 ? (
                    <p className="ms-client-booking-svcs">
                      {b.serviceTitles.join(" · ")}
                    </p>
                  ) : null}
                </div>
                <span className="ms-client-booking-chevron" aria-hidden>
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ScreenShell>
  );
}
