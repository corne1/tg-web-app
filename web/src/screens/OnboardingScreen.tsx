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
import galleryIcon from "../assets/onboarding/gallery.svg";
import infoIcon from "../assets/onboarding/info.svg";
import {
  loadMasterAvatarDataUrl,
  readFileAsDataUrl,
  saveMasterAvatarDataUrl,
} from "../lib/masterAvatar";
import { loadPublicAbout, savePublicAbout } from "../lib/publicProfile";
import {
  Button,
  Chip,
  ChipGroup,
  Field,
  Input,
  RadioMark,
  Textarea,
} from "../ui";

type PhotoSource = "telegram" | "upload";

const ABOUT_PLACEHOLDER = "Расскажите о себе и своей работе";

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const initial = loadMasterDraft();
  const tgPhoto = webApp?.initDataUnsafe?.user?.photo_url ?? null;
  const [name, setName] = useState(initial.name);
  const [serviceTypeCode, setServiceTypeCode] =
    useState<ServiceTypeCode | null>(initial.serviceTypeCode);
  const [about, setAbout] = useState(() => loadPublicAbout());
  const {
    serviceTypes,
    error: catalogError,
  } = useServiceTypes();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarTick, setAvatarTick] = useState(0);
  const [photoSource, setPhotoSource] = useState<PhotoSource>(() => {
    const local = loadMasterAvatarDataUrl();
    if (local && local !== tgPhoto && !local.startsWith("http")) return "upload";
    return "telegram";
  });
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
  void avatarTick;
  const previewAvatar =
    loadMasterAvatarDataUrl() || tgPhoto || avatarPlaceholder;

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
    savePublicAbout(about.trim());
  }, [about, city, draft.name, draft.serviceTypeCode]);

  const persistServer = useCallback(async () => {
    if (!draft.name || !draft.serviceTypeCode) return null;
    persistLocal();
    const profile = await saveMasterProfile({
      name: draft.name,
      serviceTypeCode: draft.serviceTypeCode,
      city,
      about: about.trim(),
    });
    cacheProfile(profile);
    return profile;
  }, [about, city, draft.name, draft.serviceTypeCode, persistLocal]);

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
    persistLocal();
    if (!valid) {
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate("/");
      return;
    }
    if (saving) return;
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
  }, [navigate, persistLocal, persistServer, saving, valid, webApp]);

  const selectTelegramPhoto = useCallback(() => {
    setPhotoSource("telegram");
    if (!tgPhoto) {
      setError("В Telegram нет фото профиля");
      return;
    }
    setError(null);
    void persistAvatar(tgPhoto);
    webApp?.HapticFeedback?.selectionChanged?.();
  }, [persistAvatar, tgPhoto, webApp]);

  const selectUploadPhoto = useCallback(() => {
    setPhotoSource("upload");
    setError(null);
    webApp?.HapticFeedback?.selectionChanged?.();
  }, [webApp]);

  const openGalleryPicker = useCallback(() => {
    setPhotoSource("upload");
    setError(null);
    fileRef.current?.click();
    webApp?.HapticFeedback?.selectionChanged?.();
  }, [webApp]);

  useBackButton(null);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <div className="master-setup">
      <div className="ms-toolbar">
        <div className="ms-toolbar-nav">
          <header className="ms-top ms-top-start">
            <div className="ms-top-titles">
              <h1 className="ms-top-title">Настройки записи</h1>
              <p className="ms-top-sub">Шаг 1 из 4</p>
            </div>
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

        <section className="ms-ob-photo-card" aria-label="Фото мастера">
          <div className="ms-ob-photo-head">
            <img
              className="ms-ob-avatar"
              src={previewAvatar}
              width={64}
              height={64}
              alt=""
            />
            <div className="ms-ob-photo-copy">
              <p className="ms-ob-photo-title">Фото мастера</p>
              <p className="ms-ob-photo-sub">Выберите фотографию</p>
            </div>
          </div>

          <div
            className="ms-ob-photo-options"
            role="radiogroup"
            aria-label="Источник фото"
          >
            <button
              type="button"
              className="ms-ob-photo-option"
              role="radio"
              aria-checked={photoSource === "telegram"}
              onClick={selectTelegramPhoto}
            >
              <RadioMark checked={photoSource === "telegram"} />
              <span className="ms-ob-photo-option-label">
                Использовать фото из Telegram
              </span>
            </button>
            <button
              type="button"
              className="ms-ob-photo-option"
              role="radio"
              aria-checked={photoSource === "upload"}
              onClick={selectUploadPhoto}
            >
              <RadioMark checked={photoSource === "upload"} />
              <span className="ms-ob-photo-option-label">
                Загрузить фотографию
              </span>
            </button>
          </div>

          {photoSource === "upload" ? (
            <div className="ms-ob-upload">
              <span className="ms-ob-upload-icon-wrap" aria-hidden>
                <img
                  className="ms-ob-upload-icon"
                  src={galleryIcon}
                  width={20}
                  height={20}
                  alt=""
                />
              </span>
              <p className="ms-ob-upload-text">
                Выберите фотографию из галереи устройства
              </p>
              <Button
                className="ms-ob-upload-btn"
                onClick={openGalleryPicker}
              >
                Выбрать
              </Button>
            </div>
          ) : null}
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

          <Field label="О мастере" as="label">
            <Textarea
              rows={5}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder={ABOUT_PLACEHOLDER}
            />
          </Field>
        </div>
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
          setPhotoSource("upload");
          void readFileAsDataUrl(file)
            .then(async (url) => {
              await persistAvatar(url);
            })
            .catch(() => setError("Не удалось загрузить фото"));
        }}
      />
    </div>
  );
}
