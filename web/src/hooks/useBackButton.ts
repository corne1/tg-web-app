import { useEffect } from "react";

export function useBackButton(onBack: (() => void) | null) {
  useEffect(() => {
    const btn = window.Telegram?.WebApp?.BackButton;
    if (!btn) return;

    if (!onBack) {
      btn.hide();
      return;
    }

    btn.onClick(onBack);
    btn.show();
    return () => {
      btn.offClick(onBack);
      btn.hide();
    };
  }, [onBack]);
}
