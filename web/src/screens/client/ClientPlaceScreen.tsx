import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import mapPinIcon from "../../assets/cabinet/profile/map-pin.svg";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { MsArrowRight } from "../../components/master/MsArrowRight";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import {
  needsClientAddressStep,
  patchClientDraft,
  readClientDraft,
  studioAddressLine,
  type ClientBookingDraft,
  type ClientPlaceChoice,
} from "../../lib/clientBookingDraft";
import { loadClientMaster } from "../../lib/clientMaster";
import { cx } from "../../ui";

function CarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 16h14v2.5a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5V16H9v2.5A1.5 1.5 0 0 1 7.5 20h-1A1.5 1.5 0 0 1 5 18.5V16Z"
        stroke="#623DF5"
        strokeWidth="1.5"
      />
      <path
        d="M5 16 6.2 10.5A2 2 0 0 1 8.15 9h7.7a2 2 0 0 1 1.95 1.5L19 16"
        stroke="#623DF5"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="16" r="1.25" fill="#623DF5" />
      <circle cx="16" cy="16" r="1.25" fill="#623DF5" />
    </svg>
  );
}

export function ClientPlaceScreen() {
  const { masterId: masterKey = "" } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ClientBookingDraft>(() => readClientDraft());
  const [choice, setChoice] = useState<ClientPlaceChoice | null>(
    () => readClientDraft().placeChoice,
  );

  useEffect(() => {
    let cancelled = false;
    void loadClientMaster(masterKey).then(({ draft: d }) => {
      if (cancelled) return;
      setDraft(d);
      if (d.place?.mode !== "both") {
        navigate(`/client/${encodeURIComponent(masterKey)}/services`, {
          replace: true,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [masterKey, navigate]);

  const studioLine = useMemo(
    () => studioAddressLine(draft.place),
    [draft.place],
  );
  const visitSub = useMemo(() => {
    const v = draft.place?.visit;
    if (!v) return "Мастер приедет по указанному вами адресу";
    return (
      [v.city, v.areas].filter(Boolean).join(" · ") ||
      "Мастер приедет по указанному вами адресу"
    );
  }, [draft.place]);

  const goBack = useCallback(
    () => navigate(`/client/${encodeURIComponent(masterKey)}/services`),
    [masterKey, navigate],
  );

  const continueNext = useCallback(() => {
    if (!choice) return;
    patchClientDraft({ placeChoice: choice });
    if (needsClientAddressStep(choice)) {
      navigate(`/client/${encodeURIComponent(masterKey)}/address`);
      return;
    }
    navigate(`/client/${encodeURIComponent(masterKey)}/time`);
  }, [choice, masterKey, navigate]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <ClientFlowShell
      title="Место приёма"
      onBack={goBack}
      footer={
        <button
          type="button"
          className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
          disabled={!choice}
          onClick={continueNext}
        >
          <span>Продолжить</span>
          <MsArrowRight />
        </button>
      }
    >
      <div className="ms-nb">
        <div className="ms-nb-intro">
          <h2 className="ms-nb-title">Где вам удобно?</h2>
          <p className="ms-nb-lead">Выберите, где встретиться с мастером</p>
        </div>
        <div className="ms-client-place-options" role="radiogroup">
          {draft.place?.studio ? (
            <button
              type="button"
              role="radio"
              aria-checked={choice === "studio"}
              className={cx(
                "ms-client-place-option",
                choice === "studio" && "is-on",
              )}
              onClick={() => setChoice("studio")}
            >
              <img src={mapPinIcon} width={24} height={24} alt="" aria-hidden />
              <span className="ms-client-place-option-copy">
                <span className="ms-client-place-option-title">
                  В кабинете у мастера
                </span>
                {studioLine ? (
                  <span className="ms-client-place-option-sub">{studioLine}</span>
                ) : null}
              </span>
            </button>
          ) : null}
          {draft.place?.visit ? (
            <button
              type="button"
              role="radio"
              aria-checked={choice === "visit"}
              className={cx(
                "ms-client-place-option",
                choice === "visit" && "is-on",
              )}
              onClick={() => setChoice("visit")}
            >
              <CarIcon />
              <span className="ms-client-place-option-copy">
                <span className="ms-client-place-option-title">
                  С выездом к вам
                </span>
                <span className="ms-client-place-option-sub">{visitSub}</span>
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </ClientFlowShell>
  );
}
