import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { saveMasterAvatar, saveMasterProfile } from "../api";
import {
  isFromReview,
  navigateToOnboardingReview,
} from "../lib/onboardingReviewEdit";
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
import { cacheProfile, getCachedProfile } from "../lib/profileStorage";
import infoIcon from "../assets/onboarding/info.svg";
import {
  prepareAvatarDataUrl,
  resolveMasterAvatarSrc,
  saveMasterAvatarDataUrl,
} from "../lib/masterAvatar";
import { loadPublicAbout, savePublicAbout } from "../lib/publicProfile";
import {
  BackIcon,
  Button,
  Chip,
  ChipGroup,
  Field,
  IconButton,
  Input,
  Textarea,
  TEXTAREA_MAX_LEN,
} from "../ui";

const ABOUT_PLACEHOLDER = "Расскажите о себе и своей работе";

function CameraBadge() {
  return (
    <span className="ms-ob-cam" aria-hidden>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M4.2 4.2 5 3h4l.8 1.2H11a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5.2a1 1 0 0 1 1-1h1.2Z"
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="7" cy="7.2" r="1.8" stroke="#fff" strokeWidth="1.2" />
      </svg>
    </span>
  );
}

export function OnboardingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { webApp } = useTelegram();
  const [fromReview] = useState(() => isFromReview(location.state));
  const initial = loadMasterDraft();
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
  const [previewAvatar, setPreviewAvatar] = useState(() =>
    resolveMasterAvatarSrc(getCachedProfile()?.avatarUrl),
  );
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

  const persistAvatar = useCallback(async (url: string) => {
    saveMasterAvatarDataUrl(url);
    setPreviewAvatar(url);
    try {
      const profile = await saveMasterAvatar(url);
      cacheProfile(profile);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить фото",
      );
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
      if (fromReview) {
        webApp?.HapticFeedback?.notificationOccurred("success");
        navigateToOnboardingReview(navigate);
        return;
      }
      webApp?.HapticFeedback?.impactOccurred("light");
      navigate("/onboarding/services");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }, [fromReview, navigate, persistServer, saving, valid, webApp]);

  const openGalleryPicker = useCallback(() => {
    setError(null);
    fileRef.current?.click();
    webApp?.HapticFeedback?.selectionChanged?.();
  }, [webApp]);

  const goBackToReview = useCallback(() => {
    persistLocal();
    navigateToOnboardingReview(navigate);
  }, [navigate, persistLocal]);

  useBackButton(fromReview ? goBackToReview : null);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <div className="master-setup">
      <div className="ms-toolbar">
        <div className="ms-toolbar-nav">
          <header className={fromReview ? "ms-top" : "ms-top ms-top-start"}>
            {fromReview ? (
              <IconButton label="Назад" onClick={goBackToReview}>
                <BackIcon />
              </IconButton>
            ) : null}
            <div className="ms-top-titles">
              <h1 className="ms-top-title">Настройки записи</h1>
              <p className="ms-top-sub">Шаг 1 из 4</p>
            </div>
            {fromReview ? <span className="ms-top-spacer" aria-hidden /> : null}
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

        <button
          type="button"
          className="ms-ob-photo-card"
          onClick={openGalleryPicker}
        >
          <span className="ms-ob-avatar-wrap">
            <img
              className="ms-ob-avatar"
              src={previewAvatar}
              width={64}
              height={64}
              alt=""
            />
            <CameraBadge />
          </span>
          <span className="ms-ob-photo-copy">
            <span className="ms-ob-photo-title">Фото мастера</span>
            <span className="ms-ob-photo-sub">
              Отображается на публичной странице
            </span>
          </span>
        </button>

        <div className="ms-form-stack">
          <Field label="Имя" as="label">
            <Input
              type="text"
              placeholder="Анна"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
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
              maxLength={TEXTAREA_MAX_LEN}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder={ABOUT_PLACEHOLDER}
            />
          </Field>
        </div>
      </div>

      <footer className="ms-footer">
        {!fromReview ? (
          <p className="ms-next-hint">Следующий шаг — Услуги и цены</p>
        ) : null}
        {error && <p className="error">{error}</p>}
        <div className="ms-footer-actions">
          <Button
            disabled={!valid || saving}
            onClick={() => void handleContinue()}
          >
            {saving ? "Сохранение…" : fromReview ? "Сохранить" : "Продолжить"}
            {!fromReview ? <MsArrowRight /> : null}
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
          void prepareAvatarDataUrl(file)
            .then(async (url) => {
              setError(null);
              await persistAvatar(url);
            })
            .catch(() => setError("Не удалось загрузить фото"));
        }}
      />
    </div>
  );
}
