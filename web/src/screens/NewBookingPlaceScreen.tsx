import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookingClientSummary } from "../components/booking/BookingClientSummary";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { MsArrowRight } from "../components/master/MsArrowRight";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import {
  bookingTotals,
  patchBookingDraft,
  readBookingDraft,
  resolveBookingClient,
  resolveBookingServices,
} from "../lib/bookingDraft";
import { loadMasterDraft, type PlaceMode } from "../lib/masterDraft";
import { Chip, ChipGroup, Field, Input, cx } from "../ui";

function bookingNeedsPlaceStep(mode: PlaceMode | null): boolean {
  return mode === "visit" || mode === "both";
}

/** Blur #50–54 — place step when master works with client visits. */
export function NewBookingPlaceScreen() {
  const navigate = useNavigate();
  const master = useMemo(() => loadMasterDraft(), []);
  const draft = useMemo(() => readBookingDraft(), []);
  const client = resolveBookingClient(draft.clientId, draft);
  const services = resolveBookingServices(draft.serviceIds);
  const totals = bookingTotals(services);
  const mode = master.placeMode;

  const [placeChoice, setPlaceChoice] = useState<"studio" | "visit" | null>(
    () =>
      draft.placeChoice ??
      (mode === "visit" ? "visit" : mode === "studio" ? "studio" : null),
  );
  const [visitCity, setVisitCity] = useState(
    () => draft.visitCity || master.visitPlace.city || master.city || "",
  );
  const [visitArea, setVisitArea] = useState(() => draft.visitArea);
  const [visitAddress, setVisitAddress] = useState(() => draft.visitAddress);

  const goBack = useCallback(
    () => navigate("/cabinet/booking/new/time"),
    [navigate],
  );
  const goCabinet = useCallback(() => navigate("/cabinet"), [navigate]);
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  useEffect(() => {
    if (!client || services.length === 0 || !draft.dateISO || !draft.time) {
      navigate("/cabinet/booking/new", { replace: true });
      return;
    }
    if (!bookingNeedsPlaceStep(mode)) {
      navigate("/cabinet/booking/new/confirm", { replace: true });
    }
  }, [client, draft.dateISO, draft.time, mode, navigate, services.length]);

  if (!client || services.length === 0) return null;

  const showChoice = mode === "both";
  const isVisit = placeChoice === "visit" || mode === "visit";
  const canContinue =
    Boolean(placeChoice || mode === "visit") &&
    (!isVisit || Boolean(visitCity.trim() && visitArea.trim()));

  return (
    <MasterSetupChrome
      step={4}
      progressFilled={4}
      topTitle="Новая запись"
      onBack={goBack}
      onClose={goCabinet}
      footer={
        <div className="ms-nb-footer">
          {!canContinue && (
            <p className="ms-nb-footer-hint">
              {isVisit
                ? "Укажите город и район выезда"
                : "Выберите место приёма"}
            </p>
          )}
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            disabled={!canContinue}
            onClick={() => {
              const choice =
                placeChoice ?? (mode === "visit" ? "visit" : "studio");
              patchBookingDraft({
                placeChoice: choice,
                visitCity: visitCity.trim(),
                visitArea: visitArea.trim(),
                visitAddress: visitAddress.trim(),
              });
              navigate("/cabinet/booking/new/confirm");
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
          <h2 className="ms-nb-title">
            {isVisit ? "Место выезда" : "Место приёма"}
          </h2>
          <p className="ms-nb-lead">
            {isVisit
              ? "Если выбран выезд к клиенту — заполните район и адрес"
              : "Уточните, где пройдёт запись"}
          </p>
        </div>

        <BookingClientSummary
          client={client}
          servicesLine={totals.titles}
          durationPriceLine={`${totals.priceLabel}`}
        />

        {showChoice ? (
          <Field label="Где пройдёт запись" as="fieldset" className="ms-field-chips">
            <ChipGroup label="Место">
              <Chip
                active={placeChoice === "studio"}
                onClick={() => setPlaceChoice("studio")}
              >
                В кабинете
              </Chip>
              <Chip
                active={placeChoice === "visit"}
                onClick={() => setPlaceChoice("visit")}
              >
                С выездом к клиенту
              </Chip>
            </ChipGroup>
          </Field>
        ) : null}

        {isVisit ? (
          <div className="ms-nb-place-fields">
            <Field label="Город" as="label">
              <Input
                value={visitCity}
                onChange={(e) => setVisitCity(e.target.value)}
                placeholder="Москва"
              />
            </Field>
            <Field label="Район выезда" as="label">
              <Input
                value={visitArea}
                onChange={(e) => setVisitArea(e.target.value)}
                placeholder="Например, Центр"
              />
            </Field>
            <Field label="Адрес клиента" as="label">
              <Input
                value={visitAddress}
                onChange={(e) => setVisitAddress(e.target.value)}
                placeholder="Улица, дом (необязательно)"
              />
            </Field>
          </div>
        ) : (
          <p className="ms-nb-place-studio">
            Запись пройдёт по адресу из вашего профиля
            {master.studioPlace.address
              ? `: ${master.studioPlace.city}, ${master.studioPlace.address}`
              : "."}
          </p>
        )}

      </div>
    </MasterSetupChrome>
  );
}

export { bookingNeedsPlaceStep };
