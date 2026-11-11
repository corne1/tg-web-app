import { useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import { readClientDraft } from "../../lib/clientBookingDraft";
import { cx } from "../../ui";

type BookingState = {
  booking?: {
    id: string;
    date: string;
    time: string;
    masterName: string;
    duration: number;
    price: number;
    priceLabel?: string;
    serviceTitles?: string[];
    placeAddress?: string | null;
  };
};

export function ClientSuccessScreen() {
  const { masterId: masterKey = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as BookingState;
  const draft = useMemo(() => readClientDraft(), []);
  const booking = state.booking;

  const openBooking = useCallback(() => {
    const id = booking?.id ?? draft.bookingId;
    if (id) {
      navigate(`/client/bookings/${encodeURIComponent(id)}`, { replace: true });
      return;
    }
    navigate("/client/bookings");
  }, [booking?.id, draft.bookingId, navigate]);

  useBackButton(() => navigate(`/client/${encodeURIComponent(masterKey)}`));
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <ClientFlowShell hideHeader>
      <div className="ms-client-success">
        <div className="ms-client-success-mark" aria-hidden>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="20" fill="#22C55E" />
            <path
              d="M12 20.5 17.2 25.5 28 14.5"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="ms-client-success-title">Вы записаны!</h1>
        <p className="ms-client-success-status">Подтверждена</p>
        <dl className="ms-client-summary">
          <div className="ms-client-summary-row">
            <dt>Дата и время</dt>
            <dd>
              {booking?.date ?? draft.dateLabel} ·{" "}
              {booking?.time ?? draft.timeLabel}
            </dd>
          </div>
          <div className="ms-client-summary-row">
            <dt>Мастер</dt>
            <dd>{booking?.masterName ?? draft.masterName}</dd>
          </div>
          {(booking?.serviceTitles?.length || draft.serviceIds.length) ? (
            <div className="ms-client-summary-row">
              <dt>Услуги</dt>
              <dd>
                {booking?.serviceTitles?.join(" · ") ??
                  draft.servicesCatalog
                    .filter((s) => draft.serviceIds.includes(s.id))
                    .map((s) => s.title)
                    .join(" · ")}
              </dd>
            </div>
          ) : null}
          {booking?.placeAddress ? (
            <div className="ms-client-summary-row">
              <dt>Адрес</dt>
              <dd>{booking.placeAddress}</dd>
            </div>
          ) : null}
        </dl>
        <button
          type="button"
          className={cx("ms-btn", "ms-btn-primary", "ms-client-cta")}
          onClick={openBooking}
        >
          Открыть мою запись
        </button>
      </div>
    </ClientFlowShell>
  );
}
