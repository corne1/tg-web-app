import { useEffect, useMemo, useState } from "react";

export function useTelegram() {
  const webApp = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
  const [colorScheme, setColorScheme] = useState<"light" | "dark">(
    webApp?.colorScheme ?? "light",
  );

  useEffect(() => {
    if (!webApp) return;

    webApp.ready();
    webApp.expand();

    const bg = webApp.themeParams.bg_color ?? "#ffffff";
    const header = webApp.themeParams.header_bg_color ?? bg;
    try {
      webApp.setBackgroundColor(bg);
      webApp.setHeaderColor(header);
    } catch {
      // Older clients may reject custom colors.
    }

    document.documentElement.dataset.theme = webApp.colorScheme;
    document.documentElement.style.setProperty("--tg-bg", bg);
    document.documentElement.style.setProperty(
      "--tg-text",
      webApp.themeParams.text_color ?? "#000000",
    );
    document.documentElement.style.setProperty(
      "--tg-hint",
      webApp.themeParams.hint_color ?? "#999999",
    );
    document.documentElement.style.setProperty(
      "--tg-button",
      webApp.themeParams.button_color ?? "#2481cc",
    );
    document.documentElement.style.setProperty(
      "--tg-button-text",
      webApp.themeParams.button_text_color ?? "#ffffff",
    );
    document.documentElement.style.setProperty(
      "--tg-secondary-bg",
      webApp.themeParams.secondary_bg_color ?? "#f0f0f0",
    );

    setColorScheme(webApp.colorScheme);
  }, [webApp]);

  return useMemo(
    () => ({
      webApp,
      user: webApp?.initDataUnsafe?.user,
      initData: webApp?.initData ?? "",
      startParam: webApp?.initDataUnsafe?.start_param,
      colorScheme,
      isTelegram: Boolean(webApp?.initData),
    }),
    [webApp, colorScheme],
  );
}
