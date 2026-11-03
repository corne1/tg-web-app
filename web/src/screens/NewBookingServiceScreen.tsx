import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookingClientSummary } from "../components/booking/BookingClientSummary";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { MsArrowRight } from "../components/master/MsArrowRight";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import {
  bookingCatalogServices,
  bookingTotals,
  formatDuration,
  formatPrice,
  patchBookingDraft,
  readBookingDraft,
  resolveBookingClient,
  resolveBookingServices,
} from "../lib/bookingDraft";
import { cx } from "../ui";

export function NewBookingServiceScreen() {
  const navigate = useNavigate();
  const initial = useMemo(() => readBookingDraft(), []);
  const client = resolveBookingClient(initial.clientId);
  const catalog = useMemo(() => bookingCatalogServices(), []);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => initial.serviceIds,
  );

  const selected = useMemo(
    () => resolveBookingServices(selectedIds),
    [selectedIds],
  );
  const totals = useMemo(() => bookingTotals(selected), [selected]);
  const canContinue = selectedIds.length > 0;

  const goBack = useCallback(
    () => navigate("/cabinet/booking/new"),
    [navigate],
  );
  const goCabinet = useCallback(() => navigate("/cabinet"), [navigate]);
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  useEffect(() => {
    if (!client) navigate("/cabinet/booking/new", { replace: true });
  }, [client, navigate]);

  if (!client) return null;

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <MasterSetupChrome
      step={2}
      progressFilled={2}
      topTitle="Новая запись"
      onBack={goBack}
      onClose={goCabinet}
      footer={
        <div className="ms-nb-footer">
          {canContinue ? (
            <div className="ms-nb-footer-totals">
              <span>{formatDuration(totals.totalMin)}</span>
              <span aria-hidden>·</span>
              <span>{totals.priceLabel}</span>
            </div>
          ) : (
            <p className="ms-nb-footer-hint">Выберите хотя бы одну услугу</p>
          )}
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            disabled={!canContinue}
            onClick={() => {
              patchBookingDraft({
                serviceIds: selectedIds,
                dateISO: null,
                time: null,
              });
              navigate("/cabinet/booking/new/time");
            }}
          >
            <span>Продолжить</span>
            <MsArrowRight />
          </button>
        </div>
      }
    >
      <div className="ms-nb">
        <div className="ms-nb-intro">
          <h2 className="ms-nb-title">Какие услуги нужны?</h2>
          <p className="ms-nb-lead">Можно выбрать несколько услуг за один визит</p>
        </div>

        <BookingClientSummary client={client} />

        <div className="ms-nb-svc-list" role="group" aria-label="Услуги">
          {catalog.map((svc) => {
            const on = selectedIds.includes(svc.id);
            return (
              <button
                key={svc.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                className={cx("ms-nb-svc", on && "is-on")}
                onClick={() => toggle(svc.id)}
              >
                <span className={cx("ms-nb-check", on && "is-on")} aria-hidden>
                  {on ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3 7.2 5.8 10 11 4"
                        stroke="#fff"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                <span className="ms-nb-svc-copy">
                  <span className="ms-nb-svc-title">{svc.title}</span>
                  <span className="ms-nb-svc-meta">
                    {formatDuration(svc.durationMin)}
                    {svc.breakAfterMin > 0
                      ? ` · +${formatDuration(svc.breakAfterMin)} перерыв`
                      : ""}
                  </span>
                </span>
                <span className="ms-nb-svc-price">{formatPrice(svc)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </MasterSetupChrome>
  );
}
