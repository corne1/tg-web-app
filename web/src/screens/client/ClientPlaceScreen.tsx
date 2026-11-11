import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import carIcon from "../../assets/client/car.svg";
import houseIcon from "../../assets/client/house.svg";
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
      progressFilled={2}
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
          <p className="ms-nb-lead">Выберите, где встретиться</p>
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
              <img src={houseIcon} width={24} height={24} alt="" aria-hidden />
              <span className="ms-client-place-option-copy">
                <span className="ms-client-place-option-title">В кабинете</span>
                {studioLine ? (
                  <span className="ms-client-place-option-sub">{studioLine}</span>
                ) : null}
              </span>
              <span
                className={cx(
                  "ms-preset-radio",
                  choice === "studio" && "is-checked",
                )}
                aria-hidden
              />
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
              <img src={carIcon} width={24} height={24} alt="" aria-hidden />
              <span className="ms-client-place-option-copy">
                <span className="ms-client-place-option-title">
                  С выездом к вам
                </span>
                <span className="ms-client-place-option-sub">
                  Мастер приедет по вашему адресу
                </span>
              </span>
              <span
                className={cx(
                  "ms-preset-radio",
                  choice === "visit" && "is-checked",
                )}
                aria-hidden
              />
            </button>
          ) : null}
        </div>
      </div>
    </ClientFlowShell>
  );
}
