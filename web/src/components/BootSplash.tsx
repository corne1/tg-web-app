import { useEffect } from "react";
import welcomeLogotype from "../assets/onboarding/welcome-logotype.svg";
import { useTelegram } from "../hooks/useTelegram";

const SPLASH_BG = "#623df5";
const WORD = "ПОМНЮ";

/** Figma 21397:14582 — purple splash; ПОМНЮ letters cycle as loading cue. */
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
        <div className="ms-boot-mark-wrap" aria-hidden>
          <img
            className="ms-boot-mark"
            src={welcomeLogotype}
            width={156}
            height={128}
            alt=""
          />
        </div>
        <p className="ms-boot-word" aria-hidden>
          {WORD.split("").map((letter, i) => (
            <span
              key={`${letter}-${i}`}
              className="ms-boot-letter"
              style={{ ["--i" as string]: i }}
            >
              {letter}
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
