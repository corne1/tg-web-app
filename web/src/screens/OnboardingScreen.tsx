import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveMasterAvatar, saveMasterProfile } from "../api";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useServiceTypes } from "../hooks/useServiceTypes";
import { useTelegram } from "../hooks/useTelegram";
import {
  loadMasterDraft,
  saveMasterDraft,
  type ServiceTypeCode,
} from "../lib/masterDraft";
import { MsArrowRight } from "../components/master/MsArrowRight";
import { cacheProfile } from "../lib/profileStorage";
import avatarPlaceholder from "../assets/onboarding/avatar-placeholder.svg";
import infoIcon from "../assets/onboarding/info.svg";
import {
  loadMasterAvatarDataUrl,
  readFileAsDataUrl,
  saveMasterAvatarDataUrl,
} from "../lib/masterAvatar";
import {
  BottomSheet,
  Button,
  Chip,
  ChipGroup,
  CloseIcon,
  Field,
  IconButton,
  Input,
  SheetSimpleHeader,
} from "../ui";

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const initial = loadMasterDraft();
  const [name, setName] = useState(initial.name);
  const [serviceTypeCode, setServiceTypeCode] =
    useState<ServiceTypeCode | null>(initial.serviceTypeCode);
  const {
    serviceTypes,
    error: catalogError,
    metaFor,
  } = useServiceTypes();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [avatarTick, setAvatarTick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const city = initial.city || "Москва";

  useEffect(() => {
    if (catalogError) setError(catalogError);
  }, [catalogError]);

  const draft = useMemo(
    () => ({ name: name.trim(), serviceTypeCode, city }),
    [name, serviceTypeCode, city],
  );
  const valid = Boolean(draft.name && draft.serviceTypeCode);
  const meta = metaFor(serviceTypeCode, serviceTypes);
  const previewName = draft.name || "Анна";
  const previewTitle = meta?.title ?? "";
  const previewChip = meta?.label ?? "";
  void avatarTick;
  const previewAvatar =
    loadMasterAvatarDataUrl() ||
    webApp?.initDataUnsafe?.user?.photo_url ||
    avatarPlaceholder;

  const persistAvatar = useCallback(async (url: string) => {
    saveMasterAvatarDataUrl(url);
    setAvatarTick((n) => n + 1);
    try {
      const profile = await saveMasterAvatar(url);
      cacheProfile(profile);
    } catch {
      // keep local preview
    }
  }, []);

  const persistLocal = useCallback(() => {
    const prev = loadMasterDraft();
    saveMasterDraft({
      ...prev,
      name: draft.name,
      serviceTypeCode: draft.serviceTypeCode,
      city,
    });
  }, [city, draft.name, draft.serviceTypeCode]);

  const persistServer = useCallback(async () => {
    if (!draft.name || !draft.serviceTypeCode) return null;
    persistLocal();
    const profile = await saveMasterProfile({
      name: draft.name,
      serviceTypeCode: draft.serviceTypeCode,
      city,
    });
    cacheProfile(profile);
    return profile;
  }, [city, draft.name, draft.serviceTypeCode, persistLocal]);

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

  useBackButton(null);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <div className="master-setup">
      <div className="ms-toolbar">
        <div className="ms-toolbar-nav">
          <header className="ms-top">
            <span className="ms-top-spacer" aria-hidden />
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

          <div className="ms-service-type-stack">
            <Field
              label="Основное направление"
              as="fieldset"
              className="ms-field-chips"
            >
              <ChipGroup label="Основное направление">
                {serviceTypes.map((s) => (
                  <Chip
                    key={s.code}
                    active={serviceTypeCode === s.code}
                    onClick={() => setServiceTypeCode(s.code)}
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
              <div className="ms-info-copy">
                <p>Остальные услуги можно добавить позже</p>
              </div>
            </div>
          </div>
        </div>

        <section className="ms-preview" aria-label="Превью страницы записи">
          <p className="ms-preview-eyebrow">Так увидят клиенты</p>
          <div className="ms-preview-head">
            <button
              type="button"
              className="ms-avatar-btn"
              aria-label="Изменить фото"
              onClick={() => setPhotoSheet(true)}
            >
              <img
                className="ms-avatar"
                src={previewAvatar}
                width={48}
                height={48}
                alt=""
              />
            </button>
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

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="ms-visually-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          void readFileAsDataUrl(file)
            .then(async (url) => {
              await persistAvatar(url);
              setPhotoSheet(false);
            })
            .catch(() => setError("Не удалось загрузить фото"));
        }}
      />

      <BottomSheet open={photoSheet} onClose={() => setPhotoSheet(false)}>
        <SheetSimpleHeader
          title="Фото мастера"
          lead="Загрузите из галереи или возьмите из Telegram"
        />
        <div className="ms-edit-photo-sheet">
          <Button
            variant="secondary"
            disabled={!webApp?.initDataUnsafe?.user?.photo_url}
            onClick={() => {
              const url = webApp?.initDataUnsafe?.user?.photo_url;
              if (!url) {
                setError("В Telegram нет фото профиля");
                return;
              }
              void persistAvatar(url).then(() => setPhotoSheet(false));
            }}
          >
            Из профиля Telegram
          </Button>
          <Button variant="primary" onClick={() => fileRef.current?.click()}>
            Выбрать из галереи
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
