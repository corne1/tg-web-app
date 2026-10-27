import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchMe } from "../api";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";

export function EmptyStateScreen() {
  const navigate = useNavigate();
  const { isTelegram, webApp } = useTelegram();
  const [copied, setCopied] = useState(false);
  const [bookingLink, setBookingLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMe()
      .then((me) => {
        if (cancelled) return;
        setBookingLink(me.profile?.bookingLink ?? null);
        if (!me.profile) {
          setError("Сначала завершите онбординг");
        } else if (!me.profile.bookingLink) {
          setError("Задайте BOT_USERNAME в env, чтобы генерировать ссылку");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copyLink = useCallback(async () => {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);
      webApp?.HapticFeedback?.notificationOccurred("success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      webApp?.showAlert?.(bookingLink);
    }
  }, [bookingLink, webApp]);

  const goCabinet = useCallback(() => navigate("/cabinet"), [navigate]);
  useBackButton(goCabinet);
  useMainButton({
    text: copied ? "Ссылка скопирована" : "Скопировать ссылку",
    visible: isTelegram && Boolean(bookingLink),
    onClick: () => {
      void copyLink();
    },
  });

  return (
    <ScreenShell
      footer={
        !isTelegram ? (
          <UiMainButton onClick={() => void copyLink()} disabled={!bookingLink}>
            {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
          </UiMainButton>
        ) : undefined
      }
    >
      <div className="empty-state">
        <div className="empty-illustration" aria-hidden>
          <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="28" width="120" height="72" rx="12" className="illu-card" />
            <path
              d="M48 58h64M48 72h40"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.35"
            />
            <circle cx="116" cy="36" r="18" className="illu-accent" />
            <path
              d="M110 36h12M116 30v12"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="empty-title">Пока нет записей</h1>
        <p className="empty-text">Отправьте ссылку клиентам — они запишутся сами</p>
        {bookingLink && (
          <p className="screen-subtitle" style={{ wordBreak: "break-all" }}>
            {bookingLink}
          </p>
        )}
        {error && <p className="error">{error}</p>}
        <Link to="/cabinet" className="text-link">
          ← К расписанию
        </Link>
      </div>
    </ScreenShell>
  );
}
