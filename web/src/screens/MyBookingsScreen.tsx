import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchMyBookings } from "../api";
import { BookingsListSkeleton } from "../components/calendar/Skeleton";
import { ClientFlowShell } from "../components/client/ClientFlowShell";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import type { ClientBooking } from "../types";
import { ChevronRightIcon } from "../ui";

export function MyBookingsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
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

  useBackButton(goHome);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <ClientFlowShell title="Мои записи" onBack={goHome}>
      <div className="ms-nb">
        <div className="ms-nb-intro">
          <h2 className="ms-nb-title">Мои записи</h2>
          <p className="ms-nb-lead">Предстоящие визиты</p>
        </div>

        {error ? <p className="ms-client-error">{error}</p> : null}

        {loading ? (
          <BookingsListSkeleton />
        ) : bookings.length === 0 ? (
          <div className="ms-client-bookings-empty">
            <p className="ms-client-bookings-empty-title">
              Нет предстоящих записей
            </p>
            <p className="ms-client-bookings-empty-sub">
              Откройте ссылку мастера в Telegram, чтобы записаться.
            </p>
          </div>
        ) : (
          <ul className="ms-client-bookings">
            {bookings.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className="ms-client-booking-card"
                  onClick={() =>
                    navigate(`/client/bookings/${encodeURIComponent(b.id)}`)
                  }
                >
                  <div className="ms-client-booking-copy">
                    <p className="ms-client-booking-when">
                      {b.date}, {b.time}
                    </p>
                    <p className="ms-client-booking-who">с {b.masterName}</p>
                    {b.serviceTitles && b.serviceTitles.length > 0 ? (
                      <p className="ms-client-booking-svcs">
                        {b.serviceTitles.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <span className="ms-client-booking-chevron" aria-hidden>
                    <ChevronRightIcon />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ClientFlowShell>
  );
}
