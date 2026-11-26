import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cancelBooking, fetchClientBooking } from "../../api";
import { ClientCancelBookingModal } from "../../components/client/ClientCancelBookingModal";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { ClientMyBookingView } from "../../components/client/ClientMyBookingView";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import type { ClientBooking } from "../../types";
import { cx } from "../../ui";

export function ClientBookingDetailScreen() {
  const { bookingId = "" } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<ClientBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClientBooking(bookingId);
      setBooking(data.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const goBack = useCallback(
    () => navigate("/client/bookings"),
    [navigate],
  );

  const onReschedule = useCallback(() => {
    if (!booking?.canReschedule) return;
    navigate(
      `/client/${booking.masterId}/time?reschedule=${encodeURIComponent(booking.id)}`,
    );
  }, [booking, navigate]);

  const onCancelConfirm = useCallback(async () => {
    if (!booking || busy) return;
    setBusy(true);
    setError(null);
    try {
      await cancelBooking(booking.id);
      setCancelOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отменить");
    } finally {
      setBusy(false);
    }
  }, [booking, busy, load]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const cancelled = booking?.status === "cancelled";
  const priceLabel =
    booking?.priceLabel ??
    (booking?.price != null
      ? `${booking.price.toLocaleString("ru-RU")} ₽`
      : null);

  return (
    <>
      <ClientFlowShell
        title="Моя запись"
        onBack={goBack}
        footer={
          booking && !loading ? (
            cancelled ? (
              <div className="ms-nb-footer">
                <button
                  type="button"
                  className={cx("ms-btn", "ms-btn-primary", "ms-client-cta")}
                  onClick={() => navigate(`/client/${booking.masterId}`)}
                >
                  Записаться снова
                </button>
              </div>
            ) : (
              <div className="ms-nb-footer ms-client-success-footer">
                {error ? <p className="ms-client-error">{error}</p> : null}
                {booking.canReschedule ? (
                  <button
                    type="button"
                    className={cx("ms-btn", "ms-btn-primary", "ms-client-cta")}
                    onClick={onReschedule}
                  >
                    Перенести мою запись
                  </button>
                ) : booking.rescheduleBlockedReason ? (
                  <p className="ms-client-rule-hint">
                    {booking.rescheduleBlockedReason}
                  </p>
                ) : null}
                {booking.canCancel ? (
                  <button
                    type="button"
                    className="ms-client-success-cancel"
                    onClick={() => setCancelOpen(true)}
                  >
                    Отменить запись
                  </button>
                ) : booking.cancelBlockedReason ? (
                  <p className="ms-client-rule-hint">
                    {booking.cancelBlockedReason}
                  </p>
                ) : null}
              </div>
            )
          ) : undefined
        }
      >
        {loading ? (
          <p className="ms-client-muted">Загрузка…</p>
        ) : error && !booking ? (
          <p className="ms-client-error">{error}</p>
        ) : booking ? (
          <ClientMyBookingView
            cancelled={cancelled}
            masterName={booking.masterName}
            masterAvatarUrl={booking.masterAvatarUrl}
            serviceTitles={booking.serviceTitles}
            priceLabel={priceLabel}
            placeChoice={booking.placeChoice}
            placeLine={booking.placeAddress}
            cancelHours={booking.cancelHours ?? 24}
          />
        ) : null}
      </ClientFlowShell>

      <ClientCancelBookingModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => void onCancelConfirm()}
        busy={busy}
        dateLabel={booking?.date ?? ""}
        timeLabel={booking?.time ?? ""}
        serviceTitles={booking?.serviceTitles ?? []}
        masterName={booking?.masterName ?? ""}
      />
    </>
  );
}
