import { useEffect } from "react";

type Options = {
  text: string;
  visible?: boolean;
  onClick: () => void;
};

export function useMainButton({ text, visible = true, onClick }: Options) {
  useEffect(() => {
    const btn = window.Telegram?.WebApp?.MainButton;
    if (!btn) return;

    btn.setText(text);
    btn.onClick(onClick);
    if (visible) {
      btn.show();
      btn.enable();
    } else {
      btn.hide();
    }

    return () => {
      btn.offClick(onClick);
      btn.hide();
    };
  }, [text, visible, onClick]);
}
