import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { BackIcon, IconButton } from "../ui";

const TITLES: Record<string, string> = {
  settings: "Настройки",
  about: "О приложении",
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
    <div className="master-setup ms-cabinet">
      <header className="ms-bd-toolbar">
        <IconButton label="Назад" onClick={goBack}>
          <BackIcon />
        </IconButton>
        <h1 className="ms-bd-toolbar-title">{title}</h1>
        <span className="ms-cc-toolbar-spacer" aria-hidden />
      </header>
      <div className="ms-body ms-cab-body">
        <div className="ms-cab-empty-card">
          <div className="ms-cab-empty-copy">
            <p className="ms-cab-empty-title">Скоро здесь</p>
            <p className="ms-cab-empty-sub">
              Этот раздел появится в следующих обновлениях
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
