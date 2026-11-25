import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import coverDemo from "../../assets/cabinet/profile/cover.jpg";
import clockIcon from "../../assets/cabinet/clock.svg";
import { ClientMasterProfileSkeleton } from "../../components/calendar/Skeleton";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { PlaceModeIcon } from "../../components/master/PlaceModeIcon";
import { ServiceSparkIcon } from "../../components/master/ServiceSparkIcon";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import { useTelegram } from "../../hooks/useTelegram";
import {
  formatDuration,
  formatPrice,
  patchClientDraft,
  studioAddressLine,
} from "../../lib/clientBookingDraft";
import { loadClientMaster } from "../../lib/clientMaster";
import { isClientPreview } from "../../lib/clientPreview";
import { resolvePublicMasterAvatarSrc } from "../../lib/masterAvatar";
import { useServiceTypes } from "../../hooks/useServiceTypes";
import type { PublicMaster } from "../../types";
import { BackIcon, IconButton, cx } from "../../ui";

const SERVICES_PREVIEW = 3;

export function ClientPublicProfileScreen() {
  const { masterId: masterKey = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { webApp } = useTelegram();
  const preview = isClientPreview(location.state) ? location.state : null;
  const [master, setMaster] = useState<PublicMaster | null>(null);
  const { serviceTypes, metaFor } = useServiceTypes();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllServices, setShowAllServices] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadClientMaster(masterKey)
      .then(({ master: m }) => {
        if (cancelled) return;
        setMaster(m);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Мастер не найден");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [masterKey]);

  const role = useMemo(() => {
    const meta = metaFor(master?.serviceTypeCode ?? null, serviceTypes);
    return meta?.title ?? "";
  }, [master?.serviceTypeCode, metaFor, serviceTypes]);

  const services = master?.services ?? [];
  const visibleServices = showAllServices
    ? services
    : services.slice(0, SERVICES_PREVIEW);
  const placeLine = studioAddressLine(master?.place ?? null);
  const canBook =
    !preview && Boolean(master?.bookingEnabled) && services.length > 0;

  const leavePreview = useCallback(() => {
    if (preview) {
      navigate(preview.previewBackTo);
      return;
    }
    webApp?.close?.();
  }, [navigate, preview, webApp]);

  const goBook = useCallback(() => {
    if (preview || !master || !canBook) return;
    webApp?.HapticFeedback?.impactOccurred("light");
    patchClientDraft({
      serviceIds: [],
      placeChoice: null,
      startsAt: null,
      dateLabel: null,
      timeLabel: null,
      bookingId: null,
    });
    navigate(`/client/${encodeURIComponent(masterKey)}/services`);
  }, [canBook, master, masterKey, navigate, preview, webApp]);

  useBackButton(leavePreview);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  if (loading) {
    return (
      <ClientFlowShell hideHeader>
        <ClientMasterProfileSkeleton />
      </ClientFlowShell>
    );
  }

  if (error || !master) {
    return (
      <ClientFlowShell hideHeader>
        <p className="ms-client-muted">{error ?? "Мастер не найден"}</p>
      </ClientFlowShell>
    );
  }

  const bookLabel = preview
    ? "Записаться"
    : !master.bookingEnabled
      ? "Онлайн-запись недоступна"
      : services.length === 0
        ? "Нет доступных услуг"
        : "Записаться";

  return (
    <ClientFlowShell
      hideHeader
      footer={
        <div className={cx("ms-client-cta-wrap", preview && "is-preview")}>
          {preview ? (
            <p className="ms-client-preview-hint">
              Кнопка демонстрационная, неактивна
            </p>
          ) : null}
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-client-cta")}
            disabled={!canBook}
            aria-disabled={!canBook}
            onClick={goBook}
          >
            {bookLabel}
          </button>
        </div>
      }
    >
      <section className="ms-prof-hero ms-client-hero">
        <div className="ms-prof-cover" aria-hidden>
          <img src={coverDemo} alt="" />
        </div>
        {preview ? (
          <div className="ms-client-preview-back">
            <IconButton
              label="Назад"
              className="ms-client-preview-back-btn"
              onClick={leavePreview}
            >
              <BackIcon />
            </IconButton>
          </div>
        ) : null}
        <div className="ms-prof-identity">
          <div className="ms-prof-avatar-wrap">
            <img
              className="ms-prof-avatar"
              src={resolvePublicMasterAvatarSrc(master.avatarUrl)}
              width={100}
              height={100}
              alt=""
            />
          </div>
          <div className="ms-prof-identity-text">
            <h1 className="ms-prof-name">{master.name}</h1>
            <p className="ms-prof-role">{role}</p>
          </div>
        </div>
      </section>

      <div className="ms-client-profile-content">
        {master.about?.trim() ? (
          <section className="ms-client-block">
            <h2 className="ms-client-section-title">О мастере</h2>
            <p className="ms-client-about">{master.about.trim()}</p>
          </section>
        ) : null}

        {services.length > 0 ? (
          <section className="ms-client-block">
            <h2 className="ms-client-section-title">Услуги</h2>
            <ul className="ms-client-svc-preview">
              {visibleServices.map((s) => (
                <li key={s.id} className="ms-client-svc-row">
                  <div className="ms-service-avatar" aria-hidden>
                    <ServiceSparkIcon className="ms-service-spark" />
                  </div>
                  <div className="ms-client-svc-copy">
                    <span className="ms-client-svc-name">{s.title}</span>
                    <span className="ms-client-svc-meta">
                      <img
                        className="ms-service-timer"
                        src={clockIcon}
                        width={16}
                        height={16}
                        alt=""
                        aria-hidden
                      />
                      <span className="ms-client-svc-duration">
                        {formatDuration(s.durationMin)}
                      </span>
                      <span className="ms-service-sep" aria-hidden>
                        ·
                      </span>
                      <span className="ms-client-svc-price">
                        {formatPrice(s)}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {services.length > SERVICES_PREVIEW ? (
              <button
                type="button"
                className="ms-review-show-all"
                onClick={() => setShowAllServices((v) => !v)}
              >
                <span>{showAllServices ? "Свернуть" : "Показать все"}</span>
              </button>
            ) : null}
          </section>
        ) : null}

        {master.place && (master.place.studio || master.place.visit) ? (
          <section className="ms-client-block">
            <h2 className="ms-client-section-title">Место приёма</h2>
            {master.place.studio ? (
              <div className="ms-client-place-card">
                <div className="ms-service-avatar" aria-hidden>
                  <PlaceModeIcon mode="studio" />
                </div>
                <div>
                  <p className="ms-client-place-title">В кабинете у мастера</p>
                  {placeLine ? (
                    <p className="ms-client-place-sub">{placeLine}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {master.place.visit ? (
              <div className="ms-client-place-card">
                <div className="ms-service-avatar" aria-hidden>
                  <PlaceModeIcon mode="visit" />
                </div>
                <div>
                  <p className="ms-client-place-title">С выездом к вам</p>
                  <p className="ms-client-place-sub">
                    {[master.place.visit.city, master.place.visit.areas]
                      .filter(Boolean)
                      .join(" · ") ||
                      "Мастер приедет по указанному вами адресу"}
                  </p>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </ClientFlowShell>
  );
}
