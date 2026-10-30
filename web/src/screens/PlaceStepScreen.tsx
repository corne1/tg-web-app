import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  completeMasterOnboarding,
  setMasterOnboardingStep,
} from "../api";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  filterCities,
  isPlaceDetailsValid,
  loadMasterDraft,
  needsStudioPlace,
  needsVisitPlace,
  PLACE_OPTIONS,
  saveMasterDraft,
  type PlaceDetails,
  type PlaceMode,
} from "../lib/masterDraft";
import { cacheProfile } from "../lib/profileStorage";

type Stage = 1 | 2 | 3;
type CityField = "studio" | "visit";

function IconStudio() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="20" fill="#6B4EFF" />
      <path
        d="M12 20.5 20 14l8 6.5V28a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 12 28v-7.5Z"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 29.5V22h5v7.5"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconVisit() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="20" fill="#6B4EFF" />
      <path
        d="M13 23.5h14l-1.2-5.2A2 2 0 0 0 23.9 17H16a2 2 0 0 0-1.9 1.3L13 23.5Z"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="26" r="1.6" fill="#fff" />
      <circle cx="23.5" cy="26" r="1.6" fill="#fff" />
      <path
        d="M13 23.5h-1.2M27 23.5h1.5"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBoth() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="20" fill="#6B4EFF" />
      <path
        d="M20 12.5c-3.3 0-6 2.5-6 5.7 0 4.3 6 9.3 6 9.3s6-5 6-9.3c0-3.2-2.7-5.7-6-5.7Z"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="18.2" r="1.8" fill="#fff" />
    </svg>
  );
}

function PlaceIcon({ mode }: { mode: PlaceMode }) {
  if (mode === "studio") return <IconStudio />;
  if (mode === "visit") return <IconVisit />;
  return <IconBoth />;
}

export function PlaceStepScreen() {
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const initial = loadMasterDraft();

  const [stage, setStage] = useState<Stage>(1);
  const [placeMode, setPlaceMode] = useState<PlaceMode | null>(
    initial.placeMode,
  );
  const [studioPlace, setStudioPlace] = useState<PlaceDetails>(
    initial.studioPlace,
  );
  const [visitPlace, setVisitPlace] = useState<PlaceDetails>(
    initial.visitPlace,
  );
  const [cityField, setCityField] = useState<CityField | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [cityError, setCityError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "danger">("success");

  useEffect(() => {
    void setMasterOnboardingStep(4).catch(() => undefined);
  }, []);

  const persist = useCallback(
    (
      nextMode = placeMode,
      nextStudio = studioPlace,
      nextVisit = visitPlace,
    ) => {
      const draft = loadMasterDraft();
      saveMasterDraft({
        ...draft,
        placeMode: nextMode,
        studioPlace: nextStudio,
        visitPlace: nextVisit,
        city:
          nextStudio.city.trim() ||
          nextVisit.city.trim() ||
          draft.city ||
          "Москва",
      });
    },
    [placeMode, studioPlace, visitPlace],
  );

  const citySuggestions = useMemo(
    () => filterCities(cityQuery),
    [cityQuery],
  );

  const canContinueStage1 = Boolean(placeMode);
  const canContinueStage2 = useMemo(() => {
    if (!placeMode) return false;
    if (
      needsStudioPlace(placeMode) &&
      !isPlaceDetailsValid(studioPlace, true)
    ) {
      return false;
    }
    if (
      needsVisitPlace(placeMode) &&
      !isPlaceDetailsValid(visitPlace, false)
    ) {
      return false;
    }
    return true;
  }, [placeMode, studioPlace, visitPlace]);

  const goBack = useCallback(() => {
    if (cityField) {
      setCityField(null);
      setCityQuery("");
      setCityError(null);
      return;
    }
    if (stage > 1) {
      setStage((s) => (s === 3 ? 2 : 1));
      return;
    }
    persist();
    navigate("/onboarding/hours");
  }, [cityField, navigate, persist, stage]);

  const handleClose = useCallback(() => {
    persist();
    webApp?.close?.();
    navigate("/");
  }, [navigate, persist, webApp]);

  const showToast = useCallback(
    (message: string, tone: "success" | "danger" = "success") => {
      setToast(message);
      setToastTone(tone);
      setTimeout(() => setToast(null), 2500);
    },
    [],
  );

  const handleContinue = useCallback(async () => {
    if (stage === 1) {
      if (!canContinueStage1) return;
      persist();
      webApp?.HapticFeedback?.impactOccurred("light");
      setStage(2);
      return;
    }
    if (stage === 2) {
      if (!canContinueStage2) return;
      persist();
      webApp?.HapticFeedback?.impactOccurred("light");
      setStage(3);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      persist();
      const profile = await completeMasterOnboarding();
      cacheProfile(profile);
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate("/cabinet");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Не удалось опубликовать",
        "danger",
      );
    } finally {
      setSaving(false);
    }
  }, [
    canContinueStage1,
    canContinueStage2,
    navigate,
    persist,
    saving,
    showToast,
    stage,
    webApp,
  ]);

  const handleSaveExit = useCallback(() => {
    persist();
    webApp?.HapticFeedback?.notificationOccurred("success");
    navigate("/");
  }, [navigate, persist, webApp]);

  const openCitySearch = useCallback(
    (field: CityField) => {
      const current =
        field === "studio" ? studioPlace.city : visitPlace.city;
      setCityField(field);
      setCityQuery(current);
      setCityError(null);
    },
    [studioPlace.city, visitPlace.city],
  );

  const selectCity = useCallback(
    (city: string) => {
      if (!cityField) return;
      if (cityField === "studio") {
        const next = { ...studioPlace, city };
        setStudioPlace(next);
        persist(placeMode, next, visitPlace);
      } else {
        const next = { ...visitPlace, city };
        setVisitPlace(next);
        persist(placeMode, studioPlace, next);
      }
      setCityField(null);
      setCityQuery("");
      setCityError(null);
      webApp?.HapticFeedback?.selectionChanged?.();
    },
    [cityField, persist, placeMode, studioPlace, visitPlace, webApp],
  );

  const tryCommitCityQuery = useCallback(() => {
    const q = cityQuery.trim();
    if (!q) {
      setCityError("Укажите город");
      return;
    }
    const match = CITY_EXACT(q);
    if (!match) {
      setCityError("Город не найден. Выберите город из списка");
      return;
    }
    selectCity(match);
  }, [cityQuery, selectCity]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const primaryLabel =
    stage === 3 ? (saving ? "Публикация…" : "Опубликовать") : "Продолжить";
  const primaryDisabled =
    stage === 1
      ? !canContinueStage1
      : stage === 2
        ? !canContinueStage2
        : saving;

  if (cityField) {
    return (
      <MasterSetupChrome
        step={4}
        progressFilled={4}
        onBack={goBack}
        onClose={handleClose}
        toast={toast}
        toastTone={toastTone}
        footer={
          <button
            type="button"
            className="ms-btn-primary"
            onClick={tryCommitCityQuery}
          >
            Готово
          </button>
        }
      >
        <section className="ms-hero">
          <h2 className="ms-question">Город</h2>
          <p className="ms-lead">Начните вводить название и выберите из списка</p>
        </section>
        <label className="ms-field">
          <span className="ms-label">Поиск города</span>
          <input
            className={`ms-input ms-input-search ${cityError ? "is-invalid" : ""}`}
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              setCityError(null);
            }}
            placeholder="Например, Москва"
            autoFocus
          />
          {cityError && <span className="ms-field-error">{cityError}</span>}
        </label>
        {citySuggestions.length > 0 ? (
          <ul className="ms-city-list">
            {citySuggestions.map((city) => (
              <li key={city}>
                <button
                  type="button"
                  className="ms-city-item"
                  onClick={() => selectCity(city)}
                >
                  {city}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="ms-city-empty">
            <p className="ms-city-empty-title">Ничего не найдено</p>
            <p className="ms-city-empty-text">
              Проверьте написание или выберите другой город
            </p>
          </div>
        )}
      </MasterSetupChrome>
    );
  }

  return (
    <MasterSetupChrome
      step={4}
      progressFilled={4}
      onBack={goBack}
      onClose={handleClose}
      toast={toast}
      toastTone={toastTone}
      footer={
        <>
          <button
            type="button"
            className="ms-btn-primary"
            disabled={primaryDisabled}
            onClick={() => void handleContinue()}
          >
            {primaryLabel}
            {stage < 3 && (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path
                  d="M6.5 3.5 12 9l-5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <button type="button" className="ms-btn-secondary" onClick={handleSaveExit}>
            Сохранить и выйти
          </button>
        </>
      }
    >
      {stage === 1 && (
        <>
          <section className="ms-hero">
            <h2 className="ms-question">Где вы принимаете клиентов?</h2>
            <p className="ms-lead">
              Укажите формат приёма, чтобы клиенты понимали, где проходит встреча
            </p>
          </section>
          <p className="ms-stage-label">
            Этап 1 <span>/ 3</span>
          </p>
          <div className="ms-place-list" role="radiogroup" aria-label="Формат приёма">
            {PLACE_OPTIONS.map((opt) => {
              const active = placeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`ms-place-card ${active ? "is-active" : ""}`}
                  onClick={() => {
                    setPlaceMode(opt.id);
                    persist(opt.id);
                    webApp?.HapticFeedback?.selectionChanged?.();
                  }}
                >
                  <PlaceIcon mode={opt.id} />
                  <span className="ms-place-text">
                    <span className="ms-place-title">{opt.title}</span>
                    <span className="ms-place-sub">{opt.subtitle}</span>
                  </span>
                  <span className={`ms-radio ${active ? "is-on" : ""}`} aria-hidden />
                </button>
              );
            })}
          </div>
        </>
      )}

      {stage === 2 && placeMode && (
        <>
          <section className="ms-hero">
            <h2 className="ms-question">Где вы принимаете клиентов?</h2>
            <p className="ms-lead">
              Укажите формат приёма, чтобы клиенты понимали, где проходит встреча
            </p>
          </section>
          <p className="ms-stage-label">
            Этап 2 <span>/ 3</span>
          </p>

          {needsStudioPlace(placeMode) && (
            <section className="ms-place-block">
              <h3 className="ms-hours-section-title">Кабинет или студия</h3>
              <label className="ms-field">
                <span className="ms-label">Город</span>
                <button
                  type="button"
                  className={`ms-select ${!studioPlace.city ? "is-placeholder" : ""}`}
                  onClick={() => openCitySearch("studio")}
                >
                  <span>{studioPlace.city || "Выберите город"}</span>
                  <Chevron />
                </button>
              </label>
              <label className="ms-field">
                <span className="ms-label">Адрес</span>
                <input
                  className="ms-input"
                  placeholder="Улица, дом, офис"
                  value={studioPlace.address}
                  onChange={(e) => {
                    const next = { ...studioPlace, address: e.target.value };
                    setStudioPlace(next);
                    persist(placeMode, next, visitPlace);
                  }}
                />
              </label>
              <label className="ms-field">
                <span className="ms-label">
                  Комментарий <span className="ms-optional">необязательно</span>
                </span>
                <textarea
                  className="ms-textarea"
                  rows={3}
                  placeholder="Как пройти, этаж, домофон"
                  value={studioPlace.comment}
                  onChange={(e) => {
                    const next = { ...studioPlace, comment: e.target.value };
                    setStudioPlace(next);
                    persist(placeMode, next, visitPlace);
                  }}
                />
              </label>
            </section>
          )}

          {needsVisitPlace(placeMode) && (
            <section className="ms-place-block">
              <h3 className="ms-hours-section-title">Выезд к клиенту</h3>
              <label className="ms-field">
                <span className="ms-label">Город выезда</span>
                <button
                  type="button"
                  className={`ms-select ${!visitPlace.city ? "is-placeholder" : ""}`}
                  onClick={() => openCitySearch("visit")}
                >
                  <span>{visitPlace.city || "Выберите город"}</span>
                  <Chevron />
                </button>
              </label>
              <label className="ms-field">
                <span className="ms-label">
                  Комментарий <span className="ms-optional">необязательно</span>
                </span>
                <textarea
                  className="ms-textarea"
                  rows={3}
                  placeholder="Районы выезда, условия"
                  value={visitPlace.comment}
                  onChange={(e) => {
                    const next = { ...visitPlace, comment: e.target.value };
                    setVisitPlace(next);
                    persist(placeMode, studioPlace, next);
                  }}
                />
              </label>
            </section>
          )}
        </>
      )}

      {stage === 3 && placeMode && (
        <>
          <section className="ms-hero">
            <h2 className="ms-question">Готово к публикации</h2>
            <p className="ms-lead">
              Проверьте формат приёма. После публикации клиенты смогут записаться
              по вашей ссылке.
            </p>
          </section>
          <p className="ms-stage-label">
            Этап 3 <span>/ 3</span>
          </p>
          <div className="ms-place-summary">
            <div className="ms-place-card is-active is-static">
              <PlaceIcon mode={placeMode} />
              <span className="ms-place-text">
                <span className="ms-place-title">
                  {PLACE_OPTIONS.find((o) => o.id === placeMode)?.title}
                </span>
                <span className="ms-place-sub">
                  {PLACE_OPTIONS.find((o) => o.id === placeMode)?.subtitle}
                </span>
              </span>
            </div>
            {needsStudioPlace(placeMode) && (
              <div className="ms-place-summary-block">
                <h3 className="ms-hours-section-title">Кабинет или студия</h3>
                <p className="ms-place-summary-line">{studioPlace.city}</p>
                <p className="ms-place-summary-line">{studioPlace.address}</p>
                {studioPlace.comment.trim() && (
                  <p className="ms-place-summary-muted">{studioPlace.comment}</p>
                )}
              </div>
            )}
            {needsVisitPlace(placeMode) && (
              <div className="ms-place-summary-block">
                <h3 className="ms-hours-section-title">Выезд к клиенту</h3>
                <p className="ms-place-summary-line">{visitPlace.city}</p>
                {visitPlace.comment.trim() && (
                  <p className="ms-place-summary-muted">{visitPlace.comment}</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </MasterSetupChrome>
  );
}

function CITY_EXACT(query: string): string | null {
  const q = query.trim().toLowerCase();
  const hit = filterCities(q, 50).find((c) => c.toLowerCase() === q);
  return hit ?? null;
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
