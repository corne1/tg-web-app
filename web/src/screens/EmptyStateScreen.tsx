import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { bookingLink } from "../data/mock";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";

export function EmptyStateScreen() {
  const navigate = useNavigate();
  const { isTelegram, webApp } = useTelegram();
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);
      webApp?.HapticFeedback?.notificationOccurred("success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [webApp]);

  const goCabinet = useCallback(() => navigate("/cabinet"), [navigate]);
  useBackButton(goCabinet);
  useMainButton({
    text: copied ? "Ссылка скопирована" : "Скопировать ссылку",
    visible: isTelegram,
    onClick: () => {
      void copyLink();
    },
  });

  return (
    <ScreenShell
      footer={
        !isTelegram ? (
          <UiMainButton onClick={() => void copyLink()}>
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
        <Link to="/cabinet" className="text-link">
          ← К расписанию
        </Link>
      </div>
    </ScreenShell>
  );
}
