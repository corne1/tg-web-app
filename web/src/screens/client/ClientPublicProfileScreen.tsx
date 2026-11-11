import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import coverDemo from "../../assets/cabinet/profile/cover.jpg";
import avatarDemo from "../../assets/cabinet/profile/avatar-demo.jpg";
import mapPinIcon from "../../assets/cabinet/profile/map-pin.svg";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
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
import { specialtyMeta, type MasterSpecialty } from "../../lib/masterDraft";
import type { PublicMaster } from "../../types";
import { cx } from "../../ui";

const SERVICES_PREVIEW = 3;

export function ClientPublicProfileScreen() {
  const { masterId: masterKey = "" } = useParams();
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const [master, setMaster] = useState<PublicMaster | null>(null);
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
    const meta = specialtyMeta(
      (master?.specialty as MasterSpecialty | null) ?? null,
    );
    return meta?.title ?? "мастер";
  }, [master?.specialty]);

  const services = master?.services ?? [];
  const visibleServices = showAllServices
    ? services
    : services.slice(0, SERVICES_PREVIEW);
  const placeLine = studioAddressLine(master?.place ?? null);
  const canBook = Boolean(master?.bookingEnabled);

  const goBook = useCallback(() => {
    if (!master || !canBook) return;
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
  }, [canBook, master, masterKey, navigate, webApp]);

  useBackButton(() => webApp?.close?.());
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  if (loading) {
    return (
      <ClientFlowShell hideHeader>
        <p className="ms-client-muted">Загрузка профиля…</p>
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

  return (
    <ClientFlowShell
      hideHeader
      footer={
        <button
          type="button"
          className={cx("ms-btn", "ms-btn-primary", "ms-client-cta")}
          disabled={!canBook}
          onClick={goBook}
        >
          {canBook ? "Записаться" : "Онлайн-запись недоступна"}
        </button>
      }
    >
      <section className="ms-prof-hero ms-client-hero">
        <div className="ms-prof-cover" aria-hidden>
          <img src={coverDemo} alt="" />
        </div>
        <div className="ms-prof-identity">
          <div className="ms-prof-avatar-wrap">
            <img
              className="ms-prof-avatar"
              src={master.avatarUrl || avatarDemo}
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
          <section className="ms-client-section">
            <h2 className="ms-client-section-title">О мастере</h2>
            <p className="ms-client-about">{master.about.trim()}</p>
          </section>
        ) : null}

        {services.length > 0 ? (
          <section className="ms-client-section">
            <h2 className="ms-client-section-title">Услуги</h2>
            <ul className="ms-client-svc-preview">
              {visibleServices.map((s) => (
                <li key={s.id} className="ms-client-svc-row">
                  <span className="ms-client-svc-name">{s.title}</span>
                  <span className="ms-client-svc-meta">
                    {formatDuration(s.durationMin)}
                    <span aria-hidden> · </span>
                    {formatPrice(s)}
                  </span>
                </li>
              ))}
            </ul>
            {services.length > SERVICES_PREVIEW ? (
              <button
                type="button"
                className="ms-client-link-btn"
                onClick={() => setShowAllServices((v) => !v)}
              >
                {showAllServices ? "Свернуть" : "Показать все"}
              </button>
            ) : null}
          </section>
        ) : null}

        {master.place && (master.place.studio || master.place.visit) ? (
          <section className="ms-client-section">
            <h2 className="ms-client-section-title">Место приёма</h2>
            {master.place.studio ? (
              <div className="ms-client-place-card">
                <img src={mapPinIcon} width={20} height={20} alt="" aria-hidden />
                <div>
                  <p className="ms-client-place-title">В кабинете у мастера</p>
                  {placeLine ? (
                    <p className="ms-client-place-sub">{placeLine}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {master.place.visit && !master.place.studio ? (
              <div className="ms-client-place-card">
                <img src={mapPinIcon} width={20} height={20} alt="" aria-hidden />
                <div>
                  <p className="ms-client-place-title">С выездом к вам</p>
                  <p className="ms-client-place-sub">
                    {[master.place.visit.city, master.place.visit.areas]
                      .filter(Boolean)
                      .join(" · ") || "Мастер приедет по указанному адресу"}
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
