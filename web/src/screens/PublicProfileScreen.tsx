import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe } from "../api";
import copyIcon from "../assets/onboarding/action-copy.svg";
import editIcon from "../assets/onboarding/action-edit.svg";
import avatarDemo from "../assets/cabinet/profile/avatar-demo.jpg";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import { loadMasterAvatarDataUrl } from "../lib/masterAvatar";
import {
  loadServiceTypes,
  specialtyMetaFromCatalog,
} from "../lib/serviceTypesCatalog";
import { cacheProfile } from "../lib/profileStorage";
import type { MasterProfile } from "../types";
import type { ServiceTypeDto } from "../api";
import { BackIcon, Button, ChevronRightIcon, IconButton } from "../ui";

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

/** Figma — «Публичный профиль» to the right of Profile tab. */
export function PublicProfileScreen() {
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [copied, setCopied] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadServiceTypes().then((list) => {
      if (!cancelled) setServiceTypes(list);
    });
    void fetchMe()
      .then((me) => {
        if (cancelled || !me.profile) return;
        cacheProfile(me.profile);
        setProfile(me.profile);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const bookingLink = profile?.bookingLink ?? null;
  const linkLabel = useMemo(
    () => (bookingLink ? displayLink(bookingLink) : "—"),
    [bookingLink],
  );
  const title = useMemo(() => {
    const meta = specialtyMetaFromCatalog(
      profile?.serviceTypeCode ?? null,
      serviceTypes,
    );
    return meta?.title ?? "";
  }, [profile?.serviceTypeCode, serviceTypes]);
  const published =
    profile?.status === "active" || Boolean(profile?.onboardingComplete);
  const avatarSrc =
    loadMasterAvatarDataUrl() ||
    profile?.avatarUrl ||
    avatarDemo;

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
      window.setTimeout(() => setCopied(false), 2000);
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
    if (profile?.userId != null) {
      navigate(`/client/${profile.userId}`);
      return;
    }
    if (bookingLink && webApp?.openTelegramLink) {
      webApp.openTelegramLink(bookingLink);
      return;
    }
    if (bookingLink) window.open(bookingLink, "_blank", "noopener,noreferrer");
  }, [bookingLink, navigate, profile?.userId, webApp]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <div className="master-setup ms-cabinet ms-pub">
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
          <img src={editIcon} width={16} height={16} alt="" />
        </IconButton>
      </header>

      <div className="ms-body ms-cab-body ms-pub-body">
        <div className="ms-pub-hero">
          <img
            className="ms-pub-avatar"
            src={avatarSrc}
            width={88}
            height={88}
            alt=""
          />
          <h2 className="ms-pub-name">{profile?.name?.trim() || "Мастер"}</h2>
          <p className="ms-pub-role">{title}</p>
          {published ? (
            <span className="ms-prof-status">
              <span className="ms-prof-status-dot" aria-hidden />
              Опубликован
            </span>
          ) : (
            <span className="ms-prof-status is-draft">Черновик</span>
          )}
        </div>

        <section className="ms-pub-link-card" aria-label="Ссылка для клиентов">
          <div className="ms-pub-link-head">
            <span className="ms-success-globe" aria-hidden>
              <GlobeIcon />
            </span>
            <h3 className="ms-pub-link-title">Ссылка для клиентов</h3>
          </div>
          <div className="ms-pub-url-row">
            <div className="ms-pub-url" title={bookingLink ?? undefined}>
              {linkLabel}
            </div>
            <button
              type="button"
              className="ms-pub-copy"
              aria-label={copied ? "Скопировано" : "Копировать"}
              disabled={!bookingLink}
              onClick={() => void copyLink()}
            >
              <img src={copyIcon} width={16} height={16} alt="" />
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
          disabled={!bookingLink && profile?.userId == null}
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
