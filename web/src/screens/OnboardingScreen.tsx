import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  loadMasterDraft,
  saveMasterDraft,
  specialtyMeta,
  SPECIALTIES,
  type MasterSpecialty,
} from "../lib/masterDraft";

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const initial = loadMasterDraft();
  const [name, setName] = useState(initial.name);
  const [specialty, setSpecialty] = useState<MasterSpecialty | null>(
    initial.specialty,
  );
  const city = initial.city || "Москва";

  const draft = useMemo(
    () => ({ name: name.trim(), specialty, city }),
    [name, specialty, city],
  );
  const valid = Boolean(draft.name && draft.specialty);
  const meta = specialtyMeta(specialty);
  const previewName = draft.name || "Анна";
  const previewTitle = meta?.title ?? "мастер маникюра";
  const previewChip = meta?.label ?? "Маникюр";

  const persist = useCallback(() => {
    const prev = loadMasterDraft();
    saveMasterDraft({
      ...prev,
      name: draft.name,
      specialty: draft.specialty,
      city,
    });
  }, [city, draft.name, draft.specialty]);

  const handleBack = useCallback(() => {
    persist();
    navigate("/");
  }, [navigate, persist]);

  const handleClose = useCallback(() => {
    persist();
    webApp?.close?.();
    navigate("/");
  }, [navigate, persist, webApp]);

  const handleContinue = useCallback(() => {
    if (!valid) return;
    persist();
    webApp?.HapticFeedback?.impactOccurred("light");
    navigate("/onboarding/services");
  }, [navigate, persist, valid, webApp]);

  const handleSaveExit = useCallback(() => {
    persist();
    webApp?.HapticFeedback?.notificationOccurred("success");
    navigate("/");
  }, [navigate, persist, webApp]);

  useBackButton(handleBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <div className="master-setup">
      <header className="ms-top">
        <button
          type="button"
          className="ms-icon-btn"
          aria-label="Назад"
          onClick={handleBack}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M12.5 4.5 7 10l5.5 5.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="ms-top-titles">
          <h1 className="ms-top-title">Настройки записи</h1>
          <p className="ms-top-sub">Шаг 1 из 4</p>
        </div>
        <button
          type="button"
          className="ms-icon-btn"
          aria-label="Закрыть"
          onClick={handleClose}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path
              d="M4.5 4.5l9 9M13.5 4.5l-9 9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <div className="ms-progress" aria-hidden>
        <span className="ms-progress-seg is-on" />
        <span className="ms-progress-seg" />
        <span className="ms-progress-seg" />
        <span className="ms-progress-seg" />
      </div>

      <div className="ms-body">
        <section className="ms-hero">
          <h2 className="ms-question">Как клиенты будут вас находить?</h2>
          <p className="ms-lead">
            Эту информацию увидят на странице записи. Можно изменить в любой момент.
          </p>
        </section>

        <label className="ms-field">
          <span className="ms-label">Имя</span>
          <input
            className="ms-input"
            type="text"
            placeholder="Анна"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
            autoFocus
          />
        </label>

        <fieldset className="ms-field">
          <legend className="ms-label">Основное направление</legend>
          <div className="ms-chips" role="radiogroup" aria-label="Основное направление">
            {SPECIALTIES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={specialty === s.id}
                className={`ms-chip ${specialty === s.id ? "is-active" : ""}`}
                onClick={() => setSpecialty(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="ms-info" role="note">
          <span className="ms-info-icon" aria-hidden>
            i
          </span>
          <p>Остальные услуги можно добавить позже</p>
        </div>

        <section className="ms-preview" aria-label="Превью страницы записи">
          <p className="ms-preview-eyebrow">Так увидят клиенты</p>
          <div className="ms-preview-card">
            <div className="ms-preview-head">
              <div className="ms-avatar" aria-hidden>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M5 19c1.2-3.2 3.4-4.8 7-4.8s5.8 1.6 7 4.8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="ms-preview-meta">
                <p className="ms-preview-name">
                  {previewName} — {previewTitle}
                </p>
                <div className="ms-preview-tags">
                  <span className="ms-tag">{previewChip}</span>
                  <span className="ms-loc">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path
                        d="M6 1.5c-1.9 0-3.4 1.5-3.4 3.3C2.6 6.8 6 10.5 6 10.5s3.4-3.7 3.4-5.7C9.4 3 7.9 1.5 6 1.5Z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                      <circle cx="6" cy="4.8" r="1.1" fill="currentColor" />
                    </svg>
                    {city}
                  </span>
                </div>
              </div>
            </div>
            <div className="ms-preview-actions">
              <button type="button" className="ms-preview-btn" tabIndex={-1}>
                Выбрать время
              </button>
              <button type="button" className="ms-preview-btn is-accent" tabIndex={-1}>
                Записаться
              </button>
            </div>
          </div>
        </section>
      </div>

      <footer className="ms-footer">
        <p className="ms-next-hint">Следующий шаг — Услуги и цены</p>
        <button
          type="button"
          className="ms-btn-primary"
          disabled={!valid}
          onClick={handleContinue}
        >
          Продолжить
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path
              d="M6.5 3.5 12 9l-5.5 5.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button type="button" className="ms-btn-secondary" onClick={handleSaveExit}>
          Сохранить и выйти
        </button>
      </footer>
    </div>
  );
}
