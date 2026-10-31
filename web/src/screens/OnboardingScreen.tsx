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
import {
  BackIcon,
  Button,
  Chip,
  ChipGroup,
  CloseIcon,
  Field,
  IconButton,
  Input,
} from "../ui";

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
            <IconButton label="Назад" onClick={handleBack}>
              <BackIcon />
            </IconButton>
            <div className="ms-top-titles">
              <h1 className="ms-top-title">Настройки записи</h1>
              <p className="ms-top-sub">Шаг 1 из 4</p>
            </div>
            <IconButton label="Закрыть" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
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
          <Field label="Имя" as="label">
            <Input
              type="text"
              placeholder="Анна"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              autoFocus
            />
          </Field>

          <div className="ms-specialty-stack">
            <Field
              label="Основное направление"
              as="fieldset"
              className="ms-field-chips"
            >
              <ChipGroup label="Основное направление">
                {SPECIALTIES.map((s) => (
                  <Chip
                    key={s.id}
                    active={specialty === s.id}
                    onClick={() => setSpecialty(s.id)}
                  >
                    {s.label}
                  </Chip>
                ))}
              </ChipGroup>
            </Field>

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
          <Button
            disabled={!valid || saving}
            onClick={() => void handleContinue()}
          >
            {saving ? "Сохранение…" : "Продолжить"}
            <MsArrowRight />
          </Button>
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => void handleSaveExit()}
          >
            Сохранить и выйти
          </Button>
        </div>
      </footer>
    </div>
  );
}
