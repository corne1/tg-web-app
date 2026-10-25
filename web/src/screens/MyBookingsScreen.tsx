import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { SecondaryButton } from "../components/calendar/SecondaryButton";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  loadClientBookings,
  saveClientBookings,
} from "../lib/profileStorage";
import type { ClientBooking } from "../types";

export function MyBookingsScreen() {
  const navigate = useNavigate();
  const { isTelegram } = useTelegram();
  const [bookings, setBookings] = useState<ClientBooking[]>(() => loadClientBookings());

  function cancel(id: string) {
    setBookings((list) => {
      const next = list.filter((b) => b.id !== id);
      saveClientBookings(next);
      return next;
    });
  }

  const goClient = useCallback(() => navigate("/client"), [navigate]);
  const bookAgain = useCallback(() => navigate("/client"), [navigate]);

  useBackButton(goClient);
  useMainButton({
    text: "Записаться",
    visible: isTelegram && bookings.length === 0,
    onClick: bookAgain,
  });

  return (
    <ScreenShell
      title="Мои записи"
      subtitle="Предстоящие консультации"
      footer={
        <div className="footer-links">
          <Link to="/notifications" className="text-link">
            Уведомления →
          </Link>
          <Link to="/" className="text-link">
            На главную
          </Link>
        </div>
      }
    >
      {bookings.length === 0 ? (
        <div className="empty-inline">
          <p>Нет предстоящих записей</p>
          {!isTelegram && (
            <UiMainButton onClick={bookAgain}>Записаться</UiMainButton>
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
                <p className="booking-who">с {b.psychologistName}</p>
              </div>
              <div className="booking-actions">
                <SecondaryButton
                  fullWidth={false}
                  className="btn-sm"
                  onClick={() => navigate("/client")}
                >
                  Перенести
                </SecondaryButton>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => cancel(b.id)}
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
