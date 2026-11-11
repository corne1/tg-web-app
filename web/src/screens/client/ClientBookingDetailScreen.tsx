import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cancelBooking, fetchClientBooking } from "../../api";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import { useTelegram } from "../../hooks/useTelegram";
import { formatDuration } from "../../lib/clientBookingDraft";
import type { ClientBooking } from "../../types";
import { BottomSheet, Button, cx, SheetSimpleHeader } from "../../ui";

export function ClientBookingDetailScreen() {
  const { bookingId = "" } = useParams();
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const [booking, setBooking] = useState<ClientBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const copyLink = useCallback(async () => {
    const link = booking?.bookingLink;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      webApp?.HapticFeedback?.notificationOccurred("success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      webApp?.showAlert?.(link);
    }
  }, [booking?.bookingLink, webApp]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const cancelled = booking?.status === "cancelled";

  return (
    <>
      <ClientFlowShell title="Моя запись" onBack={goBack}>
        {loading ? (
          <p className="ms-client-muted">Загрузка…</p>
        ) : error && !booking ? (
          <p className="ms-client-error">{error}</p>
        ) : booking ? (
          <div className="ms-client-detail">
            <div
              className={cx(
                "ms-client-detail-status",
                cancelled && "is-cancelled",
              )}
            >
              {cancelled ? "Отменена" : "Подтверждена"}
            </div>

            <dl className="ms-client-summary">
              <div className="ms-client-summary-row">
                <dt>Дата и время</dt>
                <dd>
                  {booking.date} · {booking.time}
                </dd>
              </div>
              <div className="ms-client-summary-row">
                <dt>Мастер</dt>
                <dd>{booking.masterName}</dd>
              </div>
              {booking.serviceTitles && booking.serviceTitles.length > 0 ? (
                <div className="ms-client-summary-row">
                  <dt>Услуги</dt>
                  <dd>{booking.serviceTitles.join(" · ")}</dd>
                </div>
              ) : null}
              {booking.duration ? (
                <div className="ms-client-summary-row">
                  <dt>Длительность</dt>
                  <dd>{formatDuration(booking.duration)}</dd>
                </div>
              ) : null}
              {booking.price != null ? (
                <div className="ms-client-summary-row">
                  <dt>Стоимость</dt>
                  <dd>{booking.price.toLocaleString("ru-RU")} ₽</dd>
                </div>
              ) : null}
            </dl>

            {error ? <p className="ms-client-error">{error}</p> : null}

            {booking.bookingLink ? (
              <button
                type="button"
                className="ms-btn ms-btn-outline"
                onClick={() => void copyLink()}
              >
                {copied ? "Ссылка скопирована" : "Скопировать ссылку на запись"}
              </button>
            ) : null}

            {!cancelled ? (
              <div className="ms-client-detail-actions">
                {booking.canReschedule ? (
                  <button
                    type="button"
                    className={cx("ms-btn", "ms-btn-primary")}
                    onClick={onReschedule}
                  >
                    Перенести запись
                  </button>
                ) : (
                  <p className="ms-client-rule-hint">
                    {booking.rescheduleBlockedReason}
                  </p>
                )}
                {booking.canCancel ? (
                  <button
                    type="button"
                    className="ms-btn ms-btn-ghost ms-client-cancel-btn"
                    onClick={() => setCancelOpen(true)}
                  >
                    Отменить запись
                  </button>
                ) : (
                  <p className="ms-client-rule-hint">
                    {booking.cancelBlockedReason}
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                className={cx("ms-btn", "ms-btn-primary")}
                onClick={() =>
                  navigate(`/client/${booking.masterId}`)
                }
              >
                Записаться снова
              </button>
            )}
          </div>
        ) : null}
      </ClientFlowShell>

      <BottomSheet open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <SheetSimpleHeader title="Отменить запись?" />
        {booking ? (
          <p className="ms-client-cancel-copy">
            {booking.date}, {booking.time} · {booking.masterName}
          </p>
        ) : null}
        <div className="ms-client-cancel-actions">
          <Button
            className="ms-btn"
            variant="primary"
            disabled={busy}
            onClick={() => void onCancelConfirm()}
          >
            {busy ? "Отменяем…" : "Да, отменить запись"}
          </Button>
          <Button
            className="ms-btn"
            variant="ghost"
            onClick={() => setCancelOpen(false)}
          >
            Оставить запись
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
