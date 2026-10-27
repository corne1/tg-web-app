import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";

/** Stub until step 3 designs are implemented. */
export function HoursPlaceholderScreen() {
  const navigate = useNavigate();
  const goBack = useCallback(() => navigate("/onboarding/services"), [navigate]);
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <MasterSetupChrome
      step={3}
      progressFilled={3}
      onBack={goBack}
      onClose={() => navigate("/")}
      footer={
        <button type="button" className="ms-btn-secondary" onClick={() => navigate("/")}>
          Сохранить и выйти
        </button>
      }
    >
      <section className="ms-hero">
        <h2 className="ms-question">Рабочее время</h2>
        <p className="ms-lead">Экран шага 3 появится по следующему макету.</p>
      </section>
    </MasterSetupChrome>
  );
}
