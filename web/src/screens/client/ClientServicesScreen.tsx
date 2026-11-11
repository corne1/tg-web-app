import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clockPurpleIcon from "../../assets/cabinet/clock-purple.svg";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { MsArrowRight } from "../../components/master/MsArrowRight";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import {
  clientBookingTotals,
  formatDuration,
  formatPrice,
  needsClientPlaceStep,
  patchClientDraft,
  readClientDraft,
  resolveAutoPlaceChoice,
  selectedServicesLabel,
  type ClientBookingDraft,
} from "../../lib/clientBookingDraft";
import { loadClientMaster } from "../../lib/clientMaster";
import { serviceLetter } from "../../lib/bookingDraft";
import { cx } from "../../ui";

export function ClientServicesScreen() {
  const { masterId: masterKey = "" } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ClientBookingDraft>(() => readClientDraft());
  const [loading, setLoading] = useState(draft.masterKey !== masterKey);

  useEffect(() => {
    let cancelled = false;
    void loadClientMaster(masterKey)
      .then(({ draft: d }) => {
        if (!cancelled) {
          setDraft(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          navigate(`/client/${encodeURIComponent(masterKey)}`, { replace: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [masterKey, navigate]);

  const selected = useMemo(
    () =>
      draft.serviceIds
        .map((id) => draft.servicesCatalog.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    [draft],
  );
  const totals = useMemo(() => clientBookingTotals(selected), [selected]);
  const canContinue = selected.length > 0;

  const goBack = useCallback(
    () => navigate(`/client/${encodeURIComponent(masterKey)}`),
    [masterKey, navigate],
  );

  const continueNext = useCallback(() => {
    const next = patchClientDraft({
      serviceIds: draft.serviceIds,
      startsAt: null,
      dateLabel: null,
      timeLabel: null,
    });
    if (needsClientPlaceStep(next.place)) {
      navigate(`/client/${encodeURIComponent(masterKey)}/place`);
      return;
    }
    const auto = resolveAutoPlaceChoice(next.place);
    patchClientDraft({ placeChoice: auto });
    if (auto === "visit") {
      navigate(`/client/${encodeURIComponent(masterKey)}/address`);
      return;
    }
    navigate(`/client/${encodeURIComponent(masterKey)}/time`);
  }, [draft.serviceIds, masterKey, navigate]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const toggle = (id: string) => {
    setDraft((prev) => {
      const serviceIds = prev.serviceIds.includes(id)
        ? prev.serviceIds.filter((x) => x !== id)
        : [...prev.serviceIds, id];
      return { ...prev, serviceIds };
    });
  };

  if (loading) {
    return (
      <ClientFlowShell title="Выбор услуг" onBack={goBack}>
        <p className="ms-client-muted">Загрузка…</p>
      </ClientFlowShell>
    );
  }

  return (
    <ClientFlowShell
      title="Выбор услуг"
      onBack={goBack}
      footer={
        <div className="ms-nb-footer">
          {canContinue ? (
            <div className="ms-nb-foot-sum">
              <div className="ms-nb-foot-sum-row">
                <span className="ms-nb-foot-sum-label">
                  {selectedServicesLabel(selected.length)}
                </span>
                <span className="ms-nb-foot-sum-price">{totals.priceLabel}</span>
              </div>
              <p className="ms-nb-foot-sum-dur">
                <img src={clockPurpleIcon} width={16} height={16} alt="" aria-hidden />
                <span>Длительность: {formatDuration(totals.totalMin)}</span>
              </p>
            </div>
          ) : null}
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            disabled={!canContinue}
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
          <h2 className="ms-nb-title">Выберите услуги</h2>
          <p className="ms-nb-lead">Можно выбрать несколько услуг</p>
        </div>
        <div className="ms-nb-svc-list" role="group" aria-label="Услуги">
          {draft.servicesCatalog.map((svc) => {
            const on = draft.serviceIds.includes(svc.id);
            return (
              <button
                key={svc.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                className={cx("ms-nb-svc", on && "is-on")}
                onClick={() => toggle(svc.id)}
              >
                <span className="ms-nb-svc-avatar" aria-hidden>
                  {serviceLetter(svc.title)}
                </span>
                <span className="ms-nb-svc-copy">
                  <span className="ms-nb-svc-title">{svc.title}</span>
                  <span className="ms-nb-svc-meta">
                    {formatDuration(svc.durationMin)}
                    <span aria-hidden> · </span>
                    {formatPrice(svc)}
                  </span>
                </span>
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
              </button>
            );
          })}
        </div>
      </div>
    </ClientFlowShell>
  );
}
