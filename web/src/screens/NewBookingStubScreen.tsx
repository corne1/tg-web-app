import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";

const STEPS: Record<
  string,
  { step: 1 | 2 | 3 | 4; title: string }
> = {
  service: { step: 2, title: "Услуга" },
  time: { step: 3, title: "Время" },
  confirm: { step: 4, title: "Подтверждение" },
  client: { step: 1, title: "Новый клиент" },
};

/** Placeholder until Figma steps 2–4 / new-client are implemented. */
export function NewBookingStubScreen() {
  const navigate = useNavigate();
  const { stepKey = "service" } = useParams<{ stepKey: string }>();
  const meta = STEPS[stepKey] ?? STEPS.service;

  const goBack = useCallback(
    () => navigate("/cabinet/booking/new"),
    [navigate],
  );
  const goCabinet = useCallback(() => navigate("/cabinet"), [navigate]);
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <MasterSetupChrome
      step={meta.step}
      progressFilled={meta.step}
      topTitle="Новая запись"
      onBack={goBack}
      onClose={goCabinet}
    >
      <div className="ms-nb">
        <h2 className="ms-nb-title">{meta.title}</h2>
        <p className="ms-nb-lead">Экран шага скоро будет по макету Figma.</p>
      </div>
    </MasterSetupChrome>
  );
}
