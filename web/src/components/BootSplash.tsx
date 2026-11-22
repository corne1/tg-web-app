import { useEffect } from "react";
import bootMark from "../assets/onboarding/boot-mark.svg";
import { useTelegram } from "../hooks/useTelegram";

const SPLASH_BG = "#623df5";

/** Product wordmark on boot splash (replaces ПОМНЮ letter paths). */
const WORDMARK = "Онлайн запись";

/** Figma 21397:14582 — purple splash; mark + animated wordmark. */
export function BootSplash({
  label = "Подключение…",
  framed = false,
}: {
  /** Accessible status; visually hidden. */
  label?: string;
  /** Wrap with app-frame (boot before router). */
  framed?: boolean;
}) {
  const { webApp } = useTelegram();

  useEffect(() => {
    if (!webApp) return;
    try {
      webApp.setBackgroundColor(SPLASH_BG);
      webApp.setHeaderColor(SPLASH_BG);
    } catch {
      // Older clients may reject custom colors.
    }
  }, [webApp]);

  const content = (
    <main className="ms-boot-splash" aria-busy="true" aria-live="polite">
      <div className="ms-boot-brand">
        <img
          className="ms-boot-mark"
          src={bootMark}
          width={86}
          height={87}
          alt=""
          aria-hidden
        />
        <p className="ms-boot-word" aria-label={WORDMARK}>
          {[...WORDMARK].map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="ms-boot-letter"
              style={{ ["--i" as string]: i }}
            >
              {ch === " " ? "\u00a0" : ch}
            </span>
          ))}
        </p>
      </div>
      <span className="ms-boot-splash-label">{label}</span>
    </main>
  );

  if (!framed) return content;
  return <div className="app-frame app-frame-splash">{content}</div>;
}
