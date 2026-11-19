import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { MsArrowRight } from "../components/master/MsArrowRight";
import { PlaceModeIcon } from "../components/master/PlaceModeIcon";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { patchBookingDraft, readBookingDraft } from "../lib/bookingDraft";
import { loadMasterDraft, type PlaceMode } from "../lib/masterDraft";
import { Field, Input, cx } from "../ui";

function bookingNeedsPlaceStep(mode: PlaceMode | null): boolean {
  return mode === "visit" || mode === "both";
}

function studioLineOf(city: string, address: string): string {
  return [city, address]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

/** Figma 21422:15801 — place choice, then the visit address step. */
export function NewBookingPlaceScreen() {
  const navigate = useNavigate();
  const master = useMemo(() => loadMasterDraft(), []);
  const draft = useMemo(() => readBookingDraft(), []);
  const mode = master.placeMode;
  const studioLine = studioLineOf(
    master.studioPlace.city,
    master.studioPlace.address,
  );

  const [placeChoice, setPlaceChoice] = useState<"studio" | "visit" | null>(
    () =>
      draft.placeChoice ??
      (mode === "visit" ? "visit" : mode === "studio" ? "studio" : null),
  );
  const [addressStep, setAddressStep] = useState(mode === "visit");
  const [visitCity, setVisitCity] = useState(
    () => draft.visitCity || master.visitPlace.city || master.city || "",
  );
  const [visitArea, setVisitArea] = useState(() => draft.visitArea);
  const [visitAddress, setVisitAddress] = useState(() => draft.visitAddress);

  const goBack = useCallback(() => {
    if (addressStep && mode === "both") {
      setAddressStep(false);
      return;
    }
    navigate("/cabinet/booking/new/time");
  }, [addressStep, mode, navigate]);
  const goCabinet = useCallback(() => navigate("/cabinet"), [navigate]);
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  useEffect(() => {
    if (!draft.clientId || draft.serviceIds.length === 0 || !draft.dateISO || !draft.time) {
      navigate("/cabinet/booking/new", { replace: true });
      return;
    }
    if (!bookingNeedsPlaceStep(mode)) {
      navigate("/cabinet/booking/new/confirm", { replace: true });
    }
  }, [
    draft.clientId,
    draft.dateISO,
    draft.serviceIds.length,
    draft.time,
    mode,
    navigate,
  ]);

  const showChoice = mode === "both" && !addressStep;
  const isVisit = placeChoice === "visit" || mode === "visit";
  const canContinue = addressStep
    ? Boolean(visitCity.trim() && visitArea.trim())
    : Boolean(placeChoice);

  function select(choice: "studio" | "visit") {
    setPlaceChoice(choice);
  }

  function onContinue() {
    if (!canContinue) return;
    if (isVisit && !addressStep) {
      setAddressStep(true);
      return;
    }
    const choice = placeChoice ?? (mode === "visit" ? "visit" : "studio");
    patchBookingDraft({
      placeChoice: choice,
      visitCity: choice === "visit" ? visitCity.trim() : "",
      visitArea: choice === "visit" ? visitArea.trim() : "",
      visitAddress: choice === "visit" ? visitAddress.trim() : "",
    });
    navigate("/cabinet/booking/new/confirm");
  }

  return (
    <MasterSetupChrome
      step={4}
      stepTotal={5}
      progressFilled={4}
      topTitle="Новая запись"
      onBack={goBack}
      onClose={goCabinet}
      footer={
        <div className="ms-nb-footer">
          {!canContinue ? (
            <p className="ms-nb-footer-hint">
              {addressStep
                ? "Укажите город и район выезда"
                : "Выберите место приёма"}
            </p>
          ) : null}
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            disabled={!canContinue}
            onClick={onContinue}
          >
            <span>Продолжить</span>
            <MsArrowRight />
          </button>
        </div>
      }
    >
      <div className="ms-nb">
        {showChoice ? (
          <>
            <div className="ms-nb-intro">
              <h2 className="ms-nb-title">Где состоится приём?</h2>
              <p className="ms-nb-lead">
                Выберите место, где вы будете принимать клиента.
              </p>
            </div>
            <div className="ms-nb-place-options" role="radiogroup">
              <div
                role="radio"
                aria-checked={placeChoice === "studio"}
                tabIndex={0}
                className={cx(
                  "ms-nb-place-card",
                  placeChoice === "studio" && "is-on",
                )}
                onClick={() => select("studio")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select("studio");
                  }
                }}
              >
                <span className="ms-nb-place-icon" aria-hidden>
                  <PlaceModeIcon mode="studio" size={20} />
                </span>
                <span className="ms-nb-place-copy">
                  <span className="ms-nb-place-title">В кабинете</span>
                  {studioLine ? (
                    <span className="ms-nb-place-sub">{studioLine}</span>
                  ) : (
                    <button
                      type="button"
                      className="ms-nb-place-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/cabinet/profile/place");
                      }}
                    >
                      Адрес не настроен
                    </button>
                  )}
                </span>
                <span className="ms-nb-place-radio" aria-hidden />
              </div>
              <div
                role="radio"
                aria-checked={placeChoice === "visit"}
                tabIndex={0}
                className={cx(
                  "ms-nb-place-card",
                  placeChoice === "visit" && "is-on",
                )}
                onClick={() => select("visit")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select("visit");
                  }
                }}
              >
                <span className="ms-nb-place-icon" aria-hidden>
                  <PlaceModeIcon mode="visit" size={20} />
                </span>
                <span className="ms-nb-place-copy">
                  <span className="ms-nb-place-title">С выездом к клиенту</span>
                  <span className="ms-nb-place-sub">Я приезжаю к клиенту</span>
                </span>
                <span className="ms-nb-place-radio" aria-hidden />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="ms-nb-intro">
              <h2 className="ms-nb-title">Куда нужно приехать?</h2>
              <p className="ms-nb-lead">
                Укажите адрес, по которому состоится приём.
              </p>
            </div>
            <div className="ms-nb-place-fields">
              <Field label="Адрес" as="label">
                <Input
                  value={visitAddress}
                  onChange={(e) => setVisitAddress(e.target.value)}
                  placeholder="Город, улица и дом"
                />
              </Field>
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
            </div>
          </>
        )}
      </div>
    </MasterSetupChrome>
  );
}

export { bookingNeedsPlaceStep };
