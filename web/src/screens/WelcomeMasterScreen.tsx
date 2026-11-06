import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import welcomeLogotype from "../assets/onboarding/welcome-logotype.svg";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";

/** Figma 21394:16640 «Добро пожаловать С ВИДОСОМ» — looping video background. */
export function WelcomeMasterScreen() {
  const navigate = useNavigate();
  const { webApp } = useTelegram();

  const goCreate = useCallback(() => {
    webApp?.HapticFeedback?.impactOccurred("light");
    navigate("/onboarding");
  }, [navigate, webApp]);

  // Comment in Figma: «Убрал кнопку назад» — hide TG BackButton.
  useBackButton(null);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <div className="master-setup ms-welcome">
      <video
        className="ms-welcome-video"
        src="/onboarding/welcome-bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
      />
      <div className="ms-welcome-scrim" aria-hidden />

      <div className="ms-welcome-body">
        <div className="ms-welcome-brand">
          <img
            className="ms-welcome-logotype"
            src={welcomeLogotype}
            width={156}
            height={128}
            alt="ПОМНЮ"
          />
        </div>

        <h1 className="ms-welcome-title">
          Ваша работа.
          <br />
          Ваши клиенты.
          <br />
          Всё под контролем.
        </h1>

        <p className="ms-welcome-lead">
          Создайте страницу мастера и начните принимать онлайн-записи.
        </p>
      </div>

      <div className="ms-welcome-footer">
        <button type="button" className="ms-welcome-cta" onClick={goCreate}>
          Создать страницу мастера
        </button>
      </div>
    </div>
  );
}
