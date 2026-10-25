import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import { savePsychologistProfile } from "../lib/profileStorage";
import type { PsychologistProfile } from "../types";

const SCHEDULE_OPTIONS = [
  { id: "weekday" as const, label: "Пн–Пт 10:00–20:00" },
  { id: "weekend" as const, label: "Сб–Вс 12:00–18:00" },
  { id: "manual" as const, label: "Настроить вручную" },
];

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { isTelegram } = useTelegram();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<PsychologistProfile>>({
    duration: 50,
  });

  const steps = [
    {
      question: "Как вас зовут?",
      content: (
        <input
          className="field"
          type="text"
          placeholder="Имя"
          value={profile.name ?? ""}
          onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
          autoFocus
        />
      ),
      valid: Boolean(profile.name?.trim()),
    },
    {
      question: "Сколько длится сессия?",
      content: (
        <div className="choice-row">
          {([50, 60] as const).map((mins) => (
            <button
              key={mins}
              type="button"
              className={`choice-btn ${profile.duration === mins ? "is-active" : ""}`}
              onClick={() => setProfile((p) => ({ ...p, duration: mins }))}
            >
              {mins} мин
            </button>
          ))}
        </div>
      ),
      valid: Boolean(profile.duration),
    },
    {
      question: "Сколько стоит сессия?",
      content: (
        <div className="field-affix">
          <input
            className="field"
            type="number"
            min={0}
            placeholder="5000"
            value={profile.price ?? ""}
            onChange={(e) =>
              setProfile((p) => ({
                ...p,
                price: e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
          />
          <span className="field-suffix">₽</span>
        </div>
      ),
      valid: typeof profile.price === "number" && profile.price > 0,
    },
    {
      question: "Когда вы работаете?",
      content: (
        <div className="choice-stack">
          {SCHEDULE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`choice-btn ${profile.schedule === opt.id ? "is-active" : ""}`}
              onClick={() => setProfile((p) => ({ ...p, schedule: opt.id }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ),
      valid: Boolean(profile.schedule),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = useCallback(() => {
    if (!current.valid) return;
    if (isLast) {
      savePsychologistProfile(profile as PsychologistProfile);
      navigate("/cabinet");
      return;
    }
    setStep((s) => s + 1);
  }, [current.valid, isLast, navigate, profile]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
      return;
    }
    navigate("/");
  }, [navigate, step]);

  useBackButton(handleBack);
  useMainButton({
    text: isLast ? "Готово" : "Далее",
    visible: isTelegram && current.valid,
    onClick: handleNext,
  });

  return (
    <ScreenShell
      title="Настройка за 5 минут"
      subtitle={`Шаг ${step + 1} из ${steps.length}`}
      footer={
        !isTelegram ? (
          <UiMainButton onClick={handleNext} disabled={!current.valid}>
            {isLast ? "Готово" : "Далее"}
          </UiMainButton>
        ) : undefined
      }
    >
      <div className="wizard">
        <div className="progress">
          {steps.map((_, i) => (
            <span key={i} className={`progress-dot ${i <= step ? "is-on" : ""}`} />
          ))}
        </div>
        <h2 className="wizard-question">{current.question}</h2>
        <div className="wizard-content">{current.content}</div>
      </div>
    </ScreenShell>
  );
}
