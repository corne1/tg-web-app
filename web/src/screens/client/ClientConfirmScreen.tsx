import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createBooking } from "../../api";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import {
  clientBookingTotals,
  formatDuration,
  patchClientDraft,
  readClientDraft,
  resolveClientServices,
  studioAddressLine,
} from "../../lib/clientBookingDraft";
import { cx } from "../../ui";

export function ClientConfirmScreen() {
  const { masterId: masterKey = "" } = useParams();
  const navigate = useNavigate();
  const draft = useMemo(() => readClientDraft(), []);
  const services = resolveClientServices(draft);
  const totals = clientBookingTotals(services);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft.startsAt || services.length === 0) {
      navigate(`/client/${encodeURIComponent(masterKey)}/services`, {
        replace: true,
      });
    }
  }, [draft.startsAt, masterKey, navigate, services.length]);

  const placeLine = useMemo(() => {
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
    return studioAddressLine(draft.place) || "В кабинете";
  }, [draft]);

  const base = `/client/${encodeURIComponent(masterKey)}`;

  const goBack = useCallback(
    () => navigate(`${base}/data`),
    [base, navigate],
  );

  const confirm = useCallback(async () => {
    if (!draft.masterId || !draft.startsAt || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await createBooking({
        masterId: draft.masterId,
        startsAt: draft.startsAt,
        serviceIds: draft.serviceIds,
        placeChoice: draft.placeChoice,
        visitCity: draft.visitCity,
        visitArea: draft.visitArea,
        visitAddress: draft.visitAddress,
        visitApt: draft.visitApt,
        visitEntrance: draft.visitEntrance,
        visitFloor: draft.visitFloor,
        visitIntercom: draft.visitIntercom,
        visitNote: draft.visitNote,
        clientName: draft.clientName,
        comment: draft.comment,
      });
      patchClientDraft({ bookingId: res.booking.id });
      navigate(`${base}/success`, {
        state: { booking: res.booking },
        replace: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось создать запись";
      setError(msg);
      if (/slot|занят|unavailable/i.test(msg)) {
        navigate(`${base}/time`, { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  }, [base, draft, navigate, submitting]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  if (!draft.startsAt || services.length === 0) return null;

  return (
    <ClientFlowShell
      title="Проверка записи"
      onBack={goBack}
      progressFilled={5}
      footer={
        <div className="ms-nb-footer">
          {error ? <p className="ms-client-error">{error}</p> : null}
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            disabled={submitting}
            onClick={() => void confirm()}
          >
            {submitting ? "Создаём…" : "Подтвердить запись"}
          </button>
        </div>
      }
    >
      <div className="ms-nb">
        <div className="ms-nb-intro">
          <h2 className="ms-nb-title">Проверьте детали</h2>
          <p className="ms-nb-lead">Перед подтверждением можно вернуться назад</p>
        </div>
        <dl className="ms-client-summary">
          <div className="ms-client-summary-row">
            <dt>Мастер</dt>
            <dd>{draft.masterName}</dd>
          </div>
          <div className="ms-client-summary-row">
            <dt>
              Услуги
              <button
                type="button"
                className="ms-client-edit-link"
                onClick={() => navigate(`${base}/services`)}
              >
                Изменить
              </button>
            </dt>
            <dd>{totals.titles}</dd>
          </div>
          <div className="ms-client-summary-row">
            <dt>Длительность</dt>
            <dd>{formatDuration(totals.totalMin)}</dd>
          </div>
          <div className="ms-client-summary-row">
            <dt>Стоимость</dt>
            <dd>{totals.priceLabel}</dd>
          </div>
          <div className="ms-client-summary-row">
            <dt>
              Дата и время
              <button
                type="button"
                className="ms-client-edit-link"
                onClick={() => navigate(`${base}/time`)}
              >
                Изменить
              </button>
            </dt>
            <dd>
              {draft.dateLabel} · {draft.timeLabel}
            </dd>
          </div>
          <div className="ms-client-summary-row">
            <dt>
              Место
              <button
                type="button"
                className="ms-client-edit-link"
                onClick={() =>
                  navigate(
                    draft.placeChoice === "visit"
                      ? `${base}/address`
                      : `${base}/place`,
                  )
                }
              >
                Изменить
              </button>
            </dt>
            <dd>
              {draft.placeChoice === "visit" ? "С выездом к вам" : "В кабинете"}
              {placeLine ? ` · ${placeLine}` : ""}
            </dd>
          </div>
          <div className="ms-client-summary-row">
            <dt>
              Имя
              <button
                type="button"
                className="ms-client-edit-link"
                onClick={() => navigate(`${base}/data`)}
              >
                Изменить
              </button>
            </dt>
            <dd>{draft.clientName}</dd>
          </div>
          {draft.comment ? (
            <div className="ms-client-summary-row">
              <dt>Комментарий</dt>
              <dd>{draft.comment}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </ClientFlowShell>
  );
}
