import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookingClientSummary } from "../components/booking/BookingClientSummary";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
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
import { cx } from "../ui";

export function NewBookingConfirmScreen() {
  const navigate = useNavigate();
  const draft = useMemo(() => readBookingDraft(), []);
  const client = resolveBookingClient(draft.clientId, draft);
  const services = resolveBookingServices(draft.serviceIds);
  const totals = bookingTotals(services);
  const [toast, setToast] = useState<string | null>(null);

  const goBack = useCallback(
    () => navigate("/cabinet/booking/new/time"),
    [navigate],
  );
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
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            onClick={() => {
              writeBookingDraft(emptyBookingDraft());
              setToast("Запись создана");
              window.setTimeout(() => navigate("/cabinet"), 900);
            }}
          >
            Создать запись
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
