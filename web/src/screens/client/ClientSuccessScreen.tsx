import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  cancelBooking,
  fetchClientBooking,
} from "../../api";
import { ClientCancelBookingModal } from "../../components/client/ClientCancelBookingModal";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { ClientMyBookingView } from "../../components/client/ClientMyBookingView";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import { useServiceTypes } from "../../hooks/useServiceTypes";
import {
  clientBookingTotals,
  readClientDraft,
  resolveClientServices,
  studioAddressLine,
} from "../../lib/clientBookingDraft";
import type { ClientBooking } from "../../types";
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
    placeChoice?: "studio" | "visit" | null;
  };
};

export function ClientSuccessScreen() {
  const { masterId: masterKey = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as BookingState;
  const draft = useMemo(() => readClientDraft(), []);
  const services = resolveClientServices(draft);
  const totals = clientBookingTotals(services);
  const { serviceTypes, metaFor } = useServiceTypes();
  const [booking, setBooking] = useState<ClientBooking | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookingId = state.booking?.id ?? draft.bookingId;

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    void fetchClientBooking(bookingId)
      .then((res) => {
        if (!cancelled) setBooking(res.booking);
      })
      .catch(() => {
        /* draft/state still render the confirmation */
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const roleLabel = useMemo(
    () =>
      metaFor(draft.masterServiceTypeCode, serviceTypes)?.label || "Мастер",
    [draft.masterServiceTypeCode, metaFor, serviceTypes],
  );

  const placeLine = useMemo(() => {
    if (booking?.placeAddress) return booking.placeAddress;
    if (state.booking?.placeAddress) return state.booking.placeAddress;
    if (draft.placeChoice === "visit") {
      return [
        draft.visitCity,
        draft.visitArea,
        draft.visitAddress,
        draft.visitApt ? `кв. ${draft.visitApt}` : "",
      ]
        .filter(Boolean)
        .join(", ");
    }
    return studioAddressLine(draft.place);
  }, [booking?.placeAddress, draft, state.booking?.placeAddress]);

  const placeChoice =
    booking?.placeChoice ?? state.booking?.placeChoice ?? draft.placeChoice;
  const placeExtra =
    placeChoice === "studio" && draft.place?.studio?.addressVisible
      ? draft.place.studio.addressHint?.trim() || ""
      : "";

  const masterName =
    booking?.masterName ?? state.booking?.masterName ?? draft.masterName;
  const priceLabel =
    booking?.priceLabel ??
    state.booking?.priceLabel ??
    (booking?.price != null
      ? `${booking.price.toLocaleString("ru-RU")} ₽`
      : state.booking?.price != null
        ? `${state.booking.price.toLocaleString("ru-RU")} ₽`
        : totals.priceLabel);

  const cancelHours = booking?.cancelHours ?? 24;
  const canReschedule = booking?.canReschedule !== false;
  const canCancel = booking?.canCancel !== false;
  const cancelled = booking?.status === "cancelled";

  const base = `/client/${encodeURIComponent(masterKey || String(booking?.masterId ?? ""))}`;

  const goHome = useCallback(() => {
    navigate(base || "/client/bookings", { replace: true });
  }, [base, navigate]);

  const onReschedule = useCallback(() => {
    if (!bookingId || !canReschedule) return;
    const mid = booking?.masterId ?? draft.masterId;
    if (!mid) return;
    navigate(
      `/client/${encodeURIComponent(String(mid))}/time?reschedule=${encodeURIComponent(bookingId)}`,
    );
  }, [booking?.masterId, bookingId, canReschedule, draft.masterId, navigate]);

  const onCancelConfirm = useCallback(async () => {
    if (!bookingId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await cancelBooking(bookingId);
      setCancelOpen(false);
      navigate("/client/bookings", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отменить");
    } finally {
      setBusy(false);
    }
  }, [bookingId, busy, navigate]);

  useBackButton(goHome);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <>
      <ClientFlowShell
        title="Моя запись"
        onBack={goHome}
        footer={
          cancelled ? (
            <div className="ms-nb-footer">
              <button
                type="button"
                className={cx("ms-btn", "ms-btn-primary", "ms-client-cta")}
                onClick={goHome}
              >
                Записаться снова
              </button>
            </div>
          ) : (
            <div className="ms-nb-footer ms-client-success-footer">
              {error ? <p className="ms-client-error">{error}</p> : null}
              {canReschedule ? (
                <button
                  type="button"
                  className={cx("ms-btn", "ms-btn-primary", "ms-client-cta")}
                  onClick={onReschedule}
                >
                  Перенести мою запись
                </button>
              ) : booking?.rescheduleBlockedReason ? (
                <p className="ms-client-rule-hint">
                  {booking.rescheduleBlockedReason}
                </p>
              ) : null}
              {canCancel ? (
                <button
                  type="button"
                  className="ms-client-success-cancel"
                  onClick={() => setCancelOpen(true)}
                >
                  Отменить запись
                </button>
              ) : booking?.cancelBlockedReason ? (
                <p className="ms-client-rule-hint">
                  {booking.cancelBlockedReason}
                </p>
              ) : null}
            </div>
          )
        }
      >
        <ClientMyBookingView
          cancelled={cancelled}
          masterName={masterName}
          roleLabel={roleLabel}
          masterAvatarUrl={
            booking?.masterAvatarUrl ?? draft.masterAvatarUrl
          }
          services={services.map((svc) => ({
            id: svc.id,
            title: svc.title,
            service: svc,
          }))}
          serviceTitles={
            booking?.serviceTitles ?? state.booking?.serviceTitles
          }
          priceLabel={priceLabel}
          placeChoice={placeChoice}
          placeLine={placeLine}
          placeExtra={placeExtra}
          cancelHours={cancelHours}
        />
      </ClientFlowShell>

      <ClientCancelBookingModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => void onCancelConfirm()}
        busy={busy}
        dateLabel={
          booking?.date ?? state.booking?.date ?? draft.dateLabel ?? ""
        }
        timeLabel={
          booking?.time ?? state.booking?.time ?? draft.timeLabel ?? ""
        }
        serviceTitles={
          booking?.serviceTitles ??
          state.booking?.serviceTitles ??
          services.map((s) => s.title)
        }
        masterName={masterName}
      />
    </>
  );
}
