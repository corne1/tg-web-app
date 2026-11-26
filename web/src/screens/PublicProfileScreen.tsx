import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchMe } from "../api";
import pencilIcon from "../assets/cabinet/profile/pencil.svg";
import copyIcon from "../assets/onboarding/action-copy.svg";
import { MasterHeroSkeleton, Skeleton } from "../components/calendar/Skeleton";
import { MasterAvatar } from "../components/master/MasterAvatar";
import { MsToast } from "../components/master/MsToast";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useServiceTypes } from "../hooks/useServiceTypes";
import { useTelegram } from "../hooks/useTelegram";
import { clientPreviewState } from "../lib/clientPreview";
import { saveMasterAvatarDataUrl } from "../lib/masterAvatar";
import { cacheProfile } from "../lib/profileStorage";
import type { MasterProfile } from "../types";
import { BackIcon, Button, ChevronRightIcon, IconButton, cx } from "../ui";

type PubLocState = { toast?: "saved" };

function displayLink(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7.25" stroke="#623DF5" strokeWidth="1.5" />
      <path
        d="M3.5 10h13M10 3.5c2.2 2.4 2.2 10.6 0 13M10 3.5c-2.2 2.4-2.2 10.6 0 13"
        stroke="#623DF5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CopyCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.333 8.333 6.333 11.333 12.667 4.667"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 10.667V2M8 2 5.333 4.667M8 2l2.667 2.667"
        stroke="currentColor"
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.667 8.667v3.666A1.333 1.333 0 0 0 4 13.667h8a1.333 1.333 0 0 0 1.333-1.334V8.667"
        stroke="currentColor"
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Figma 21416:93335 — «Публичный профиль» (management, no cover). */
export function PublicProfileScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { webApp } = useTelegram();
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const copiedResetRef = useRef<number | null>(null);
  const { serviceTypes, metaFor } = useServiceTypes();

  useEffect(
    () => () => {
      if (copiedResetRef.current != null) {
        window.clearTimeout(copiedResetRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchMe()
      .then((me) => {
        if (cancelled || !me.profile) return;
        cacheProfile(me.profile);
        setProfile(me.profile);
        if (me.profile.avatarUrl) {
          saveMasterAvatarDataUrl(me.profile.avatarUrl);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const state = location.state as PubLocState | null;
    if (state?.toast !== "saved") return;
    setToast("Изменения сохранены");
    window.setTimeout(() => setToast(null), 2500);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const bookingLink = profile?.bookingLink ?? null;
  const linkLabel = useMemo(
    () => (bookingLink ? displayLink(bookingLink) : "—"),
    [bookingLink],
  );
  const title = useMemo(() => {
    const meta = metaFor(profile?.serviceTypeCode ?? null, serviceTypes);
    return meta?.title ?? "";
  }, [metaFor, profile?.serviceTypeCode, serviceTypes]);
  const published =
    profile?.status === "active" || Boolean(profile?.onboardingComplete);

  const goBack = useCallback(
    () => navigate("/cabinet/profile"),
    [navigate],
  );

  const copyLink = useCallback(async () => {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);
      webApp?.HapticFeedback?.notificationOccurred("success");
      if (copiedResetRef.current != null) {
        window.clearTimeout(copiedResetRef.current);
      }
      copiedResetRef.current = window.setTimeout(() => {
        setCopied(false);
        copiedResetRef.current = null;
      }, 1000);
    } catch {
      webApp?.showAlert?.(bookingLink);
    }
  }, [bookingLink, webApp]);

  const shareLink = useCallback(async () => {
    if (!bookingLink) return;
    webApp?.HapticFeedback?.impactOccurred("light");
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Запись",
          text: "Запишитесь ко мне",
          url: bookingLink,
        });
        return;
      }
    } catch {
      // cancelled
    }
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(bookingLink)}`;
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(shareUrl);
      return;
    }
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }, [bookingLink, webApp]);

  const viewAsClient = useCallback(() => {
    const masterKey = profile?.slug ?? profile?.userId;
    if (masterKey == null || masterKey === "") return;
    webApp?.HapticFeedback?.impactOccurred("light");
    navigate(`/client/${encodeURIComponent(String(masterKey))}`, {
      state: clientPreviewState("/cabinet/profile/public"),
    });
  }, [navigate, profile?.slug, profile?.userId, webApp]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <div className="master-setup ms-cabinet ms-pub">
      {toast ? (
        <MsToast
          message={toast}
          tone="success"
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <header className="ms-bd-toolbar">
        <IconButton label="Назад" onClick={goBack}>
          <BackIcon />
        </IconButton>
        <h1 className="ms-bd-toolbar-title">Публичный профиль</h1>
        <IconButton
          label="Редактировать"
          className="ms-pub-edit"
          onClick={() => navigate("/cabinet/profile/edit")}
        >
          {/* Figma 21416:129888 — Button-Primary Strong 44 / Lead Icon pencil */}
          <img src={pencilIcon} width={20} height={20} alt="" />
        </IconButton>
      </header>

      <div className="ms-body ms-cab-body ms-pub-body">
        {loading ? (
          <MasterHeroSkeleton />
        ) : (
          <div className="ms-pub-hero">
            <MasterAvatar
              className="ms-pub-avatar"
              remote={profile?.avatarUrl}
              width={88}
              height={88}
            />
            <h2 className="ms-pub-name">
              {profile?.name?.trim() || "Мастер"}
            </h2>
            {title ? <p className="ms-pub-role">{title}</p> : null}
            {published ? (
              <span className="ms-prof-status">
                <span className="ms-prof-status-dot" aria-hidden />
                Опубликован
              </span>
            ) : (
              <span className="ms-prof-status is-draft">Черновик</span>
            )}
          </div>
        )}

        <section className="ms-pub-link-card" aria-label="Ссылка для клиентов">
          <div className="ms-pub-link-head">
            <span className="ms-success-globe" aria-hidden>
              <GlobeIcon />
            </span>
            <h3 className="ms-pub-link-title">Ссылка для клиентов</h3>
          </div>
          <div className="ms-pub-url-row">
            <div className="ms-pub-url" title={bookingLink ?? undefined}>
              {loading ? <Skeleton width="70%" height="16px" /> : linkLabel}
            </div>
            <button
              type="button"
              className={cx("ms-pub-copy", copied && "is-copied")}
              aria-label={copied ? "Скопировано" : "Копировать"}
              disabled={!bookingLink}
              onClick={() => void copyLink()}
            >
              {copied ? (
                <CopyCheckIcon />
              ) : (
                <img src={copyIcon} width={16} height={16} alt="" />
              )}
            </button>
          </div>
          <Button
            variant="secondary"
            className="ms-pub-share"
            disabled={!bookingLink}
            onClick={() => void shareLink()}
          >
            <ShareIcon />
            Поделиться
          </Button>
        </section>

        <button
          type="button"
          className="ms-success-preview ms-pub-preview"
          onClick={viewAsClient}
          disabled={!(profile?.slug || profile?.userId)}
        >
          <span className="ms-success-preview-text">
            <span className="ms-success-preview-title">
              Посмотреть как клиент
            </span>
            <span className="ms-success-preview-sub">
              Открыть свою опубликованную страницу
            </span>
          </span>
          <span className="ms-success-preview-chevron" aria-hidden>
            <ChevronRightIcon />
          </span>
        </button>
      </div>
    </div>
  );
}
