import { useEffect } from "react";
import { useTelegram } from "../hooks/useTelegram";

const SPLASH_BG = "#623df5";
const WORD = "ПОМНЮ";

/** Figma 21397:14551 — purple splash, animated ПОМНЮ word only (no mark). */
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
      <span className="ms-boot-splash-label">{label}</span>
    </main>
  );

  if (!framed) return content;
  return <div className="app-frame app-frame-splash">{content}</div>;
}
