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

    if (!visible) {
      btn.hide();
      return () => {
        btn.hide();
      };
    }

    btn.setText(text);
    btn.onClick(onClick);
    btn.show();
    btn.enable();

    return () => {
      btn.offClick(onClick);
      btn.hide();
    };
  }, [text, visible, onClick]);
}
