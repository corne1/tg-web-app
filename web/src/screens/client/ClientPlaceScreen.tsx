import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { MsArrowRight } from "../../components/master/MsArrowRight";
import { PlaceModeIcon } from "../../components/master/PlaceModeIcon";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import {
  needsClientAddressStep,
  needsClientPlaceStep,
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
    void loadClientMaster(masterKey)
      .then(({ draft: d }) => {
        if (cancelled) return;
        setDraft(d);
        if (!needsClientPlaceStep(d.place)) {
          navigate(`/client/${encodeURIComponent(masterKey)}/services`, {
            replace: true,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
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
        <div className="ms-nb-footer">
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            disabled={!choice}
            onClick={continueNext}
          >
            <span>Продолжить</span>
            <MsArrowRight />
          </button>
        </div>
      }
    >
      <div className="ms-nb">
        <div className="ms-nb-intro">
          <h2 className="ms-nb-title">Где вам удобно?</h2>
          <p className="ms-nb-lead">
            Выберите, где встретиться с мастером
          </p>
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
              <span className="ms-service-avatar" aria-hidden>
                <PlaceModeIcon mode="studio" size={20} />
              </span>
              <span className="ms-client-place-option-copy">
                <span className="ms-client-place-option-title">
                  В кабинете у мастера
                </span>
                {studioLine ? (
                  <span className="ms-client-place-option-sub">{studioLine}</span>
                ) : null}
              </span>
              <span className="ms-nb-place-radio" aria-hidden />
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
              <span className="ms-service-avatar" aria-hidden>
                <PlaceModeIcon mode="visit" size={20} />
              </span>
              <span className="ms-client-place-option-copy">
                <span className="ms-client-place-option-title">
                  С выездом к вам
                </span>
                <span className="ms-client-place-option-sub">
                  Мастер приедет по указанному вами адресу
                </span>
              </span>
              <span className="ms-nb-place-radio" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </ClientFlowShell>
  );
}
