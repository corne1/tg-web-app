import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsPageShell } from "../components/settings/SettingsPageShell";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";

/** Matches Figma 21446:21072 version cell. */
const APP_VERSION = "1.0.0";

/** Figma 21446:21072 — О приложении. */
export function AboutAppScreen() {
  const navigate = useNavigate();
  const goBack = useCallback(
    () => navigate("/cabinet/profile"),
    [navigate],
  );
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <SettingsPageShell title="О приложении" onBack={goBack}>
      <div className="ms-about">
        <div className="ms-about-card">
          <div className="ms-about-row">
            <span className="ms-about-label">Версия приложения</span>
            <span className="ms-about-value">{APP_VERSION}</span>
          </div>
        </div>
      </div>
    </SettingsPageShell>
  );
}
