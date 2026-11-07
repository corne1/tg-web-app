import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCabinetBooking } from "../api";
import { BookingClientSummary } from "../components/booking/BookingClientSummary";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  bookingTotals,
  emptyBookingDraft,
  formatBookingDayTitle,
  formatDuration,
  formatPrice,
  isoToDate,
  readBookingDraft,
  resolveBookingClient,
  resolveBookingServices,
  writeBookingDraft,
} from "../lib/bookingDraft";
import { loadMasterDraft } from "../lib/masterDraft";
import { cx } from "../ui";
import { bookingNeedsPlaceStep } from "./NewBookingPlaceScreen";

export function NewBookingConfirmScreen() {
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const draft = useMemo(() => readBookingDraft(), []);
  const client = resolveBookingClient(draft.clientId, draft);
  const services = resolveBookingServices(draft.serviceIds);
  const totals = bookingTotals(services);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBack = useCallback(() => {
    if (bookingNeedsPlaceStep(loadMasterDraft().placeMode)) {
      navigate("/cabinet/booking/new/place");
      return;
    }
    navigate("/cabinet/booking/new/time");
  }, [navigate]);
  const goCabinet = useCallback(() => navigate("/cabinet"), [navigate]);
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const ready =
    Boolean(client) &&
    services.length > 0 &&
    Boolean(draft.dateISO) &&
    Boolean(draft.time);

  useEffect(() => {
    if (!ready) navigate("/cabinet/booking/new", { replace: true });
  }, [ready, navigate]);

  const onCreate = useCallback(async () => {
    if (!client || !draft.dateISO || !draft.time || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createCabinetBooking({
        masterClientId: client.id,
        dateISO: draft.dateISO,
        time: draft.time,
        serviceIds: draft.serviceIds,
      });
      writeBookingDraft(emptyBookingDraft());
      webApp?.HapticFeedback?.notificationOccurred("success");
      setToast("Запись создана");
      window.setTimeout(() => navigate("/cabinet"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setSaving(false);
    }
  }, [client, draft.dateISO, draft.serviceIds, draft.time, navigate, saving, webApp]);

  if (!ready || !client || !draft.dateISO || !draft.time) return null;

  const day = isoToDate(draft.dateISO);
  const whenLine = `${formatBookingDayTitle(day)} · ${draft.time}`;

  return (
    <MasterSetupChrome
      step={4}
      progressFilled={4}
      topTitle="Новая запись"
      onBack={goBack}
      onClose={goCabinet}
      toast={toast}
      toastTone="success"
      onToastDismiss={() => setToast(null)}
      footer={
        <div className="ms-nb-footer">
          {error ? <p className="ms-footer-error">{error}</p> : null}
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            disabled={saving}
            onClick={() => void onCreate()}
          >
            {saving ? "Создание…" : "Создать запись"}
          </button>
        </div>
      }
    >
      <div className="ms-nb">
        <div className="ms-nb-intro">
          <h2 className="ms-nb-title">Проверьте запись</h2>
          <p className="ms-nb-lead">Убедитесь, что всё верно, и подтвердите</p>
        </div>

        <BookingClientSummary
          client={client}
          servicesLine={totals.titles}
          durationPriceLine={`${formatDuration(totals.totalMin)} · ${totals.priceLabel}`}
        />

        <div className="ms-nb-review">
          <div className="ms-nb-review-row">
            <span className="ms-nb-review-label">Когда</span>
            <span className="ms-nb-review-value">{whenLine}</span>
          </div>
          <div className="ms-nb-review-row">
            <span className="ms-nb-review-label">Длительность</span>
            <span className="ms-nb-review-value">
              {formatDuration(totals.totalMin)}
            </span>
          </div>
          <div className="ms-nb-review-row">
            <span className="ms-nb-review-label">Стоимость</span>
            <span className="ms-nb-review-value">{totals.priceLabel}</span>
          </div>
          {draft.placeChoice === "visit" || draft.visitArea ? (
            <div className="ms-nb-review-row">
              <span className="ms-nb-review-label">Место</span>
              <span className="ms-nb-review-value">
                {[draft.visitCity, draft.visitArea, draft.visitAddress]
                  .filter(Boolean)
                  .join(", ") || "Выезд к клиенту"}
              </span>
            </div>
          ) : null}
        </div>

        <ul className="ms-nb-review-svcs">
          {services.map((s) => (
            <li key={s.id} className="ms-nb-review-svc">
              <span className="ms-nb-review-svc-title">{s.title}</span>
              <span className="ms-nb-review-svc-meta">
                {formatDuration(s.durationMin)} · {formatPrice(s)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </MasterSetupChrome>
  );
}
