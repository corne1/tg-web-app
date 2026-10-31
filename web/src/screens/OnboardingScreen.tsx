import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveMasterProfile } from "../api";
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
import { MsArrowRight } from "../components/master/MsArrowRight";
import { cacheProfile } from "../lib/profileStorage";
import avatarPlaceholder from "../assets/onboarding/avatar-placeholder.svg";
import infoIcon from "../assets/onboarding/info.svg";

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const initial = loadMasterDraft();
  const [name, setName] = useState(initial.name);
  const [specialty, setSpecialty] = useState<MasterSpecialty | null>(
    initial.specialty,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const persistLocal = useCallback(() => {
    const prev = loadMasterDraft();
    saveMasterDraft({
      ...prev,
      name: draft.name,
      specialty: draft.specialty,
      city,
    });
  }, [city, draft.name, draft.specialty]);

  const persistServer = useCallback(async () => {
    if (!draft.name || !draft.specialty) return null;
    persistLocal();
    const profile = await saveMasterProfile({
      name: draft.name,
      specialty: draft.specialty,
      city,
    });
    cacheProfile(profile);
    return profile;
  }, [city, draft.name, draft.specialty, persistLocal]);

  const handleBack = useCallback(() => {
    persistLocal();
    navigate("/");
  }, [navigate, persistLocal]);

  const handleClose = useCallback(() => {
    persistLocal();
    webApp?.close?.();
    navigate("/");
  }, [navigate, persistLocal, webApp]);

  const handleContinue = useCallback(async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await persistServer();
      webApp?.HapticFeedback?.impactOccurred("light");
      navigate("/onboarding/services");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }, [navigate, persistServer, saving, valid, webApp]);

  const handleSaveExit = useCallback(async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await persistServer();
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }, [navigate, persistServer, saving, valid, webApp]);

  useBackButton(handleBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <div className="master-setup">
      <div className="ms-toolbar">
        <div className="ms-toolbar-nav">
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
        </div>
      </div>

      <div className="ms-body ms-body-step1">
        <section className="ms-hero">
          <h2 className="ms-question">
            Как клиенты будут
            <br />
            вас находить?
          </h2>
          <p className="ms-lead">
            Эту информацию увидят на странице записи. Можно изменить в любой момент
          </p>
        </section>

        <div className="ms-form-stack">
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

          <div className="ms-specialty-stack">
            <fieldset className="ms-field ms-field-chips">
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
              <img
                className="ms-info-icon"
                src={infoIcon}
                width={20}
                height={20}
                alt=""
                aria-hidden
              />
              <p>Остальные услуги можно добавить позже</p>
            </div>
          </div>
        </div>

        <section className="ms-preview" aria-label="Превью страницы записи">
          <p className="ms-preview-eyebrow">Так увидят клиенты</p>
          <div className="ms-preview-head">
            <img
              className="ms-avatar"
              src={avatarPlaceholder}
              width={48}
              height={48}
              alt=""
              aria-hidden
            />
            <div className="ms-preview-meta">
              <p className="ms-preview-name">
                {previewName} — {previewTitle}
              </p>
              <div className="ms-preview-tags">
                <span className="ms-tag">{previewChip}</span>
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
        </section>
      </div>

      <footer className="ms-footer">
        <p className="ms-next-hint">Следующий шаг — Услуги и цены</p>
        {error && <p className="error">{error}</p>}
        <div className="ms-footer-actions">
          <button
            type="button"
            className="ms-btn-primary"
            disabled={!valid || saving}
            onClick={() => void handleContinue()}
          >
            {saving ? "Сохранение…" : "Продолжить"}
            <MsArrowRight />
          </button>
          <button
            type="button"
            className="ms-btn-secondary"
            disabled={saving}
            onClick={() => void handleSaveExit()}
          >
            Сохранить и выйти
          </button>
        </div>
      </footer>
    </div>
  );
}
