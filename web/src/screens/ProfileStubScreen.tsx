import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SettingsPageShell } from "../components/settings/SettingsPageShell";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";

const TITLES: Record<string, string> = {
  settings: "Настройки",
};

/** Lightweight placeholder until dedicated Figma screens are wired. */
export function ProfileStubScreen() {
  const navigate = useNavigate();
  const { stubKey = "settings" } = useParams();
  const title = TITLES[stubKey] ?? "Профиль";
  const goBack = useCallback(
    () => navigate("/cabinet/profile"),
    [navigate],
  );

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <SettingsPageShell title={title} titlePlacement="page" onBack={goBack}>
      <div className="ms-cab-empty-card">
        <div className="ms-cab-empty-copy">
          <p className="ms-cab-empty-title">Скоро здесь</p>
          <p className="ms-cab-empty-sub">
            Этот раздел появится в следующих обновлениях
          </p>
        </div>
      </div>
    </SettingsPageShell>
  );
}
