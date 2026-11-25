import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clockIcon from "../../assets/cabinet/clock.svg";
import { createBooking } from "../../api";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { PlaceModeIcon } from "../../components/master/PlaceModeIcon";
import { ServiceSparkIcon } from "../../components/master/ServiceSparkIcon";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import { useServiceTypes } from "../../hooks/useServiceTypes";
import {
  clientBookingTotals,
  formatDuration,
  formatDurationLong,
  formatPrice,
  patchClientDraft,
  readClientDraft,
  resolveClientServices,
  studioAddressLine,
} from "../../lib/clientBookingDraft";
import { resolvePublicMasterAvatarSrc } from "../../lib/masterAvatar";
import { dayTitle } from "../../lib/scheduleUi";
import { cx } from "../../ui";

function ReviewEditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m15 5 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ConfirmCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M16.667 5 7.5 14.167 3.333 10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClientPersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M16.667 17.5v-1.667a3.333 3.333 0 0 0-3.334-3.333H6.667a3.333 3.333 0 0 0-3.334 3.333V17.5M10 9.167A3.333 3.333 0 1 0 10 2.5a3.333 3.333 0 0 0 0 6.667Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReviewEditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="ms-client-review-edit"
      onClick={onClick}
    >
      <span>Редактировать</span>
      <ReviewEditIcon />
    </button>
  );
}

export function ClientConfirmScreen() {
  const { masterId: masterKey = "" } = useParams();
  const navigate = useNavigate();
  const draft = useMemo(() => readClientDraft(), []);
  const services = resolveClientServices(draft);
  const totals = clientBookingTotals(services);
  const { serviceTypes, metaFor } = useServiceTypes();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabel = useMemo(
    () =>
      metaFor(draft.masterServiceTypeCode, serviceTypes)?.label || "Мастер",
    [draft.masterServiceTypeCode, metaFor, serviceTypes],
  );

  const dateHeading = useMemo(() => {
    if (draft.startsAt) {
      const d = new Date(draft.startsAt);
      if (!Number.isNaN(d.getTime())) return dayTitle(d);
    }
    return draft.dateLabel ?? "";
  }, [draft.dateLabel, draft.startsAt]);

  useEffect(() => {
    if (!draft.startsAt || services.length === 0) {
      navigate(`/client/${encodeURIComponent(masterKey)}/services`, {
        replace: true,
      });
    }
  }, [draft.startsAt, masterKey, navigate, services.length]);

  const visitDetails = useMemo(() => {
    if (draft.placeChoice !== "visit") return null;
    const bits = [
      draft.visitEntrance ? `Подъезд ${draft.visitEntrance}` : "",
      draft.visitFloor ? `Этаж ${draft.visitFloor}` : "",
      draft.visitIntercom ? `Домофон ${draft.visitIntercom}` : "",
    ].filter(Boolean);
    return {
      address: [
        draft.visitCity,
        draft.visitArea,
        draft.visitAddress,
        draft.visitApt ? `кв. ${draft.visitApt}` : "",
      ]
        .filter(Boolean)
        .join(", "),
      meta: bits.join(". "),
      note: draft.visitNote.trim(),
    };
  }, [draft]);

  const studioLine = useMemo(
    () => studioAddressLine(draft.place),
    [draft.place],
  );

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
      const msg =
        err instanceof Error ? err.message : "Не удалось создать запись";
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

  const placeEditTo =
    draft.placeChoice === "visit" ? `${base}/address` : `${base}/place`;

  return (
    <ClientFlowShell
      title="Подтверждение"
      onBack={goBack}
      progressFilled={5}
      footer={
        <div className="ms-nb-footer">
          <div className="ms-nb-foot-sum">
            <div className="ms-nb-foot-sum-row">
              <span className="ms-nb-foot-sum-label">Итого</span>
              <span className="ms-nb-foot-sum-price">{totals.priceLabel}</span>
            </div>
            <p className="ms-nb-foot-sum-dur">
              <img src={clockIcon} width={16} height={16} alt="" aria-hidden />
              <span>
                Продолжительность: {formatDurationLong(totals.totalMin)}
              </span>
            </p>
          </div>
          {error ? <p className="ms-client-error">{error}</p> : null}
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            disabled={submitting}
            onClick={() => void confirm()}
          >
            <ConfirmCheckIcon />
            <span>{submitting ? "Создаём…" : "Подтвердить запись"}</span>
          </button>
        </div>
      }
    >
      <div className="ms-nb">
        <div className="ms-nb-intro">
          <h2 className="ms-nb-title">Проверьте запись</h2>
          <p className="ms-nb-lead">Убедитесь, что всё указано верно</p>
        </div>

        {/* Figma 21467:30996 */}
        <section className="ms-client-review-card ms-client-review-master">
          <img
            className="ms-client-review-avatar"
            src={resolvePublicMasterAvatarSrc(draft.masterAvatarUrl)}
            alt=""
            width={48}
            height={48}
          />
          <div className="ms-client-review-copy">
            <p className="ms-client-review-title">{draft.masterName}</p>
            <p className="ms-client-review-sub">{roleLabel}</p>
          </div>
        </section>

        <section className="ms-client-review-block">
          <div className="ms-client-review-block-head">
            <h3 className="ms-client-review-block-title">Услуги</h3>
            <span className="ms-client-review-block-meta">
              Добавлено: {services.length}
            </span>
          </div>
          <ul className="ms-client-review-svc-list">
            {services.map((svc) => (
              <li key={svc.id} className="ms-client-review-svc">
                <span className="ms-service-avatar" aria-hidden>
                  <ServiceSparkIcon className="ms-service-spark" />
                </span>
                <span className="ms-client-review-copy">
                  <span className="ms-client-review-title">{svc.title}</span>
                  <span className="ms-client-review-sub">
                    {formatDuration(svc.durationMin)} · {formatPrice(svc)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <ReviewEditButton onClick={() => navigate(`${base}/services`)} />
        </section>

        <section className="ms-client-review-block">
          <h3 className="ms-client-review-block-title">Дата и время</h3>
          <div className="ms-client-review-card">
            <div className="ms-client-review-copy">
              <p className="ms-client-review-title">{dateHeading}</p>
              {draft.timeLabel ? (
                <p className="ms-client-review-sub">{draft.timeLabel}</p>
              ) : null}
            </div>
          </div>
          <ReviewEditButton onClick={() => navigate(`${base}/time`)} />
        </section>

        <section className="ms-client-review-block">
          <h3 className="ms-client-review-block-title">Место приёма</h3>
          <div className="ms-client-review-card">
            <span className="ms-service-avatar ms-client-review-place-ico" aria-hidden>
              <PlaceModeIcon
                mode={draft.placeChoice === "visit" ? "visit" : "studio"}
                size={20}
              />
            </span>
            <div className="ms-client-review-copy">
              <p className="ms-client-review-title">
                {draft.placeChoice === "visit"
                  ? "Выезд к вам"
                  : "В кабинете у мастера"}
              </p>
              {draft.placeChoice === "visit" ? (
                <>
                  {visitDetails?.address ? (
                    <p className="ms-client-review-sub">{visitDetails.address}</p>
                  ) : null}
                  {visitDetails?.meta ? (
                    <p className="ms-client-review-sub">{visitDetails.meta}</p>
                  ) : null}
                  {visitDetails?.note ? (
                    <p className="ms-client-review-sub">
                      Комментарий: {visitDetails.note}
                    </p>
                  ) : null}
                </>
              ) : studioLine ? (
                <p className="ms-client-review-sub">{studioLine}</p>
              ) : null}
            </div>
          </div>
          <ReviewEditButton onClick={() => navigate(placeEditTo)} />
        </section>

        <section className="ms-client-review-block">
          <h3 className="ms-client-review-block-title">Ваши данные</h3>
          <div className="ms-client-review-card">
            <span className="ms-service-avatar ms-client-review-place-ico" aria-hidden>
              <ClientPersonIcon />
            </span>
            <div className="ms-client-review-copy">
              <p className="ms-client-review-title">{draft.clientName}</p>
              {draft.comment ? (
                <p className="ms-client-review-sub">{draft.comment}</p>
              ) : null}
            </div>
          </div>
          <ReviewEditButton onClick={() => navigate(`${base}/data`)} />
        </section>
      </div>
    </ClientFlowShell>
  );
}
