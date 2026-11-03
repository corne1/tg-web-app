import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";

/** Placeholder for «новый клиент» until Figma form is wired. */
export function NewBookingStubScreen() {
  const navigate = useNavigate();
  const { stepKey = "client" } = useParams<{ stepKey: string }>();

  const goBack = useCallback(
    () => navigate("/cabinet/booking/new"),
    [navigate],
  );
  const goCabinet = useCallback(() => navigate("/cabinet"), [navigate]);
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <MasterSetupChrome
      step={1}
      progressFilled={1}
      topTitle="Новая запись"
      onBack={goBack}
      onClose={goCabinet}
    >
      <div className="ms-nb">
        <h2 className="ms-nb-title">
          {stepKey === "client" ? "Новый клиент" : "Шаг"}
        </h2>
        <p className="ms-nb-lead">Форма нового клиента — по макету Figma позже.</p>
      </div>
    </MasterSetupChrome>
  );
}
