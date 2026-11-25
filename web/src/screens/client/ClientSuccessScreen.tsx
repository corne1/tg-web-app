import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import infoIcon from "../../assets/cabinet/profile/info.svg";
import {
  cancelBooking,
  fetchClientBooking,
} from "../../api";
import { ClientCancelBookingModal } from "../../components/client/ClientCancelBookingModal";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { PlaceModeIcon } from "../../components/master/PlaceModeIcon";
import { ServiceSparkIcon } from "../../components/master/ServiceSparkIcon";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import { useServiceTypes } from "../../hooks/useServiceTypes";
import {
  clientBookingTotals,
  formatDuration,
  formatPrice,
  readClientDraft,
  resolveClientServices,
  studioAddressLine,
} from "../../lib/clientBookingDraft";
import { resolvePublicMasterAvatarSrc } from "../../lib/masterAvatar";
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

/** Figma 21477:18684 — 96px ring badge + white disc + green check. */
function SuccessCheckBadge() {
  return (
    <div className="ms-client-success-badge" aria-hidden>
      <span className="ms-client-success-badge-inner">
        <svg
          className="ms-client-success-badge-check"
          width="34"
          height="34"
          viewBox="0 0 34 34"
          fill="none"
        >
          <path
            d="M7.5 17.2 13.8 23.5 26.5 10.5"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

function ruHoursLabel(hours: number): string {
  const n = Math.max(0, Math.round(hours));
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "часов";
  if (mod10 === 1 && mod100 !== 11) word = "час";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    word = "часа";
  return `${n} ${word}`;
}

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
        hideHeader
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
        {/* Figma 21477:18678 — Запись подтверждена */}
        <div className="ms-client-success">
          <div className="ms-client-success-hero">
            <SuccessCheckBadge />
            <h1 className="ms-client-success-title">Запись подтверждена</h1>
            <p className="ms-client-success-lead">Вы записаны к мастеру</p>
          </div>

          <section className="ms-client-review-section">
            <h2 className="ms-client-review-label">Мастер</h2>
            <div className="ms-client-review-row">
              <img
                className="ms-client-review-avatar"
                src={resolvePublicMasterAvatarSrc(
                  booking?.masterAvatarUrl ?? draft.masterAvatarUrl,
                )}
                alt=""
                width={48}
                height={48}
              />
              <div className="ms-client-review-copy">
                <p className="ms-client-review-title">{masterName}</p>
                <p className="ms-client-review-sub">{roleLabel}</p>
              </div>
            </div>
          </section>

          <section className="ms-client-review-section">
            <h2 className="ms-client-review-label">Услуги и стоимость</h2>
            <ul className="ms-client-review-svc-list">
              {services.length > 0
                ? services.map((svc) => (
                    <li key={svc.id} className="ms-client-success-svc">
                      <span className="ms-service-avatar" aria-hidden>
                        <ServiceSparkIcon className="ms-service-spark" />
                      </span>
                      <span className="ms-client-review-copy">
                        <span className="ms-client-review-title">
                          {svc.title}
                        </span>
                        <span className="ms-client-review-sub">
                          {formatDuration(svc.durationMin)}
                        </span>
                      </span>
                      <span className="ms-client-success-svc-price">
                        {formatPrice(svc)}
                      </span>
                    </li>
                  ))
                : (booking?.serviceTitles ?? state.booking?.serviceTitles)?.map(
                    (title) => (
                      <li key={title} className="ms-client-success-svc">
                        <span className="ms-service-avatar" aria-hidden>
                          <ServiceSparkIcon className="ms-service-spark" />
                        </span>
                        <span className="ms-client-review-copy">
                          <span className="ms-client-review-title">{title}</span>
                        </span>
                      </li>
                    ),
                  )}
            </ul>
            {priceLabel ? (
              <div className="ms-client-success-total">
                <span>Итого</span>
                <span>{priceLabel}</span>
              </div>
            ) : null}
          </section>

          <section className="ms-client-review-section">
            <h2 className="ms-client-review-label">Место приёма</h2>
            <div className="ms-client-review-row">
              <span
                className="ms-service-avatar ms-client-review-place-ico"
                aria-hidden
              >
                <PlaceModeIcon
                  mode={placeChoice === "visit" ? "visit" : "studio"}
                  size={20}
                />
              </span>
              <div className="ms-client-review-copy">
                <p className="ms-client-review-title">
                  {placeChoice === "visit"
                    ? "Выезд к вам"
                    : "В кабинете у мастера"}
                </p>
                {placeLine ? (
                  <p className="ms-client-review-sub">{placeLine}</p>
                ) : null}
                {placeExtra ? (
                  <p className="ms-client-review-sub">{placeExtra}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="ms-client-review-section ms-client-success-rules">
            <div className="ms-client-success-rules-row">
              <img
                className="ms-client-success-rules-ico"
                src={infoIcon}
                width={20}
                height={20}
                alt=""
                aria-hidden
              />
              <p className="ms-client-success-rules-text">
                Перенести или отменить запись можно не позднее чем за{" "}
                {ruHoursLabel(cancelHours)} до визита.
              </p>
            </div>
          </section>
        </div>
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
