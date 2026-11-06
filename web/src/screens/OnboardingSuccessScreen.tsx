import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchMe } from "../api";
import copyIcon from "../assets/onboarding/action-copy.svg";
import { MsArrowRight } from "../components/master/MsArrowRight";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  cacheProfile,
  isOnboardingDone,
  masterResumePath,
} from "../lib/profileStorage";
import type { MasterProfile } from "../types";
import { Button } from "../ui";

type LocationState = {
  bookingLink?: string | null;
  profile?: MasterProfile | null;
};

function displayLink(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

/** Figma 21205:40297 — outer accent ring + white disc + check 21205:40299. */
function SuccessCheckIcon() {
  return (
    <span className="ms-success-badge-inner">
      <svg
        className="ms-success-badge-check"
        width="34"
        height="34"
        viewBox="0 0 34 34"
        fill="none"
        aria-hidden
      >
        <path
          d="M7.5 17.2 13.8 23.5 26.5 10.5"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
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

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M7.5 4.167 13.333 10 7.5 15.833"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OnboardingSuccessScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { webApp } = useTelegram();
  const state = (location.state as LocationState | null) ?? null;

  const [profile, setProfile] = useState<MasterProfile | null>(
    state?.profile ?? null,
  );
  const [bookingLink, setBookingLink] = useState<string | null>(
    state?.bookingLink ?? state?.profile?.bookingLink ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMe()
      .then((me) => {
        if (cancelled) return;
        if (me.profile) {
          cacheProfile(me.profile);
          setProfile(me.profile);
          if (!isOnboardingDone(me.profile)) {
            navigate(masterResumePath(me.profile), { replace: true });
            return;
          }
          setBookingLink(me.profile.bookingLink ?? null);
          if (!me.profile.bookingLink) {
            setError("Ссылка ещё не сформирована");
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const linkLabel = useMemo(
    () => (bookingLink ? displayLink(bookingLink) : "—"),
    [bookingLink],
  );

  const goSchedule = useCallback(() => {
    navigate("/cabinet", { replace: true });
  }, [navigate]);

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
      // User cancelled or share unsupported — fall through.
    }
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(bookingLink)}`;
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(shareUrl);
      return;
    }
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }, [bookingLink, webApp]);

  const viewAsClient = useCallback(() => {
    const masterId = profile?.userId;
    if (masterId != null) {
      navigate(`/client/${masterId}`);
      return;
    }
    if (bookingLink && webApp?.openTelegramLink) {
      webApp.openTelegramLink(bookingLink);
      return;
    }
    if (bookingLink) {
      window.open(bookingLink, "_blank", "noopener,noreferrer");
    }
  }, [bookingLink, navigate, profile?.userId, webApp]);

  useBackButton(goSchedule);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <div className="master-setup ms-success">
      <div className="ms-body ms-success-body">
        <div className="ms-success-hero">
          <div className="ms-success-badge" aria-hidden>
            <SuccessCheckIcon />
          </div>
          <h1 className="ms-success-title">Профиль опубликован!</h1>
          <p className="ms-success-lead">
            Поздравляем! Теперь клиенты могут посмотреть ваши услуги и
            записаться к вам.
          </p>
        </div>

        <section className="ms-success-card" aria-label="Ваша страница">
          <div className="ms-success-card-head">
            <span className="ms-success-globe" aria-hidden>
              <GlobeIcon />
            </span>
            <h2 className="ms-success-card-title">Ваша страница</h2>
          </div>

          <div className="ms-success-url" title={bookingLink ?? undefined}>
            {linkLabel}
          </div>

          <div className="ms-success-actions">
            <Button
              variant="secondary"
              className="ms-success-action"
              onClick={() => void copyLink()}
              disabled={!bookingLink}
            >
              <img src={copyIcon} alt="" width={16} height={16} />
              {copied ? "Скопировано" : "Копировать"}
            </Button>
            <Button
              variant="secondary"
              className="ms-success-action"
              onClick={() => void shareLink()}
              disabled={!bookingLink}
            >
              <ShareIcon />
              Поделиться
            </Button>
          </div>
        </section>

        <button
          type="button"
          className="ms-success-preview"
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

        {error && <p className="ms-footer-error">{error}</p>}
      </div>

      <footer className="ms-footer">
        <div className="ms-footer-actions">
          <Button variant="primary" onClick={goSchedule}>
            Перейти в расписание
            <MsArrowRight />
          </Button>
        </div>
      </footer>
    </div>
  );
}
